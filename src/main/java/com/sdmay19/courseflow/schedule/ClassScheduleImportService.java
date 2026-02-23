package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.flowchart.FlowChartRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import com.sdmay19.courseflow.semester.Term;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

@Service
public class ClassScheduleImportService {

    private final ClassScheduleImportParser parser;
    private final ClassScheduleEntryRepository scheduleRepository;
    private final FlowchartService flowchartService;
    private final FlowChartRepository flowChartRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;

    public ClassScheduleImportService(
            ClassScheduleImportParser parser,
            ClassScheduleEntryRepository scheduleRepository,
            FlowchartService flowchartService,
            FlowChartRepository flowChartRepository,
            SemesterRepository semesterRepository,
            CourseRepository courseRepository) {
        this.parser = parser;
        this.scheduleRepository = scheduleRepository;
        this.flowchartService = flowchartService;
        this.flowChartRepository = flowChartRepository;
        this.semesterRepository = semesterRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional
    public ImportResult importSchedule(MultipartFile file, AppUser user) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded.");
        }

        Flowchart flowchart = flowchartService.getByUser(user);
        List<ClassScheduleImportParser.ParsedScheduleRow> rows;
        try {
            rows = parser.parse(file.getInputStream());
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to parse schedule Excel: " + e.getMessage(), e);
        }
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("No schedule rows were found in this Excel export.");
        }

        Map<String, Semester> semesterByKey = new HashMap<>();
        List<Semester> flowchartSemesters = flowchart.getSemesters();
        if (flowchartSemesters == null) {
            flowchartSemesters = new ArrayList<>();
            flowchart.setSemesters(flowchartSemesters);
        }
        for (Semester semester : flowchartSemesters) {
            semesterByKey.put(semesterKey(semester.getYear(), semester.getTerm()), semester);
        }

        Set<String> touchedTermKeys = new HashSet<>();
        Set<String> importedCourseIdents = new HashSet<>();
        int linkedToCatalogCourses = 0;

        List<ClassScheduleEntry> toPersist = new ArrayList<>();

        for (ClassScheduleImportParser.ParsedScheduleRow row : rows) {
            Semester semester = semesterByKey.computeIfAbsent(
                    semesterKey(row.year(), row.term()),
                    key -> createSemester(flowchart, row.year(), row.term(), user.getMajor()));
            touchedTermKeys.add(semesterKey(row.year(), row.term()));

            Course linkedCourse = null;
            if (row.courseIdent() != null && !row.courseIdent().isBlank()) {
                linkedCourse = courseRepository.findByCourseIdent(row.courseIdent().trim().toUpperCase(Locale.ROOT)).orElse(null);
            }

            if (linkedCourse != null) {
                linkedToCatalogCourses++;
                importedCourseIdents.add(linkedCourse.getCourseIdent());
                addCourseToSemesterIfMissing(semester, linkedCourse);
            }

            ClassScheduleEntry entry = new ClassScheduleEntry();
            entry.setFlowchart(flowchart);
            entry.setCourse(linkedCourse);
            entry.setCourseIdent(row.courseIdent());
            entry.setSectionCode(row.sectionCode());
            entry.setCourseTitle(row.courseTitle());
            entry.setAcademicPeriodLabel(row.academicPeriodLabel());
            entry.setYear(row.year());
            entry.setTerm(row.term());
            entry.setTermStartDate(row.termStartDate());
            entry.setTermEndDate(row.termEndDate());
            entry.setMeetingPatternRaw(row.meetingPatternRaw());
            entry.setMeetingDays(row.meetingDays());
            entry.setMeetingStartTime(row.meetingStartTime());
            entry.setMeetingEndTime(row.meetingEndTime());
            entry.setFreeDropDeadline(row.freeDropDeadline());
            entry.setWithdrawDeadline(row.withdrawDeadline());
            entry.setInstructor(row.instructor());
            entry.setDeliveryMode(row.deliveryMode());
            entry.setLocations(row.locations());
            entry.setInstructionalFormat(row.instructionalFormat());
            toPersist.add(entry);
        }

        for (String termKey : touchedTermKeys) {
            YearTerm yearTerm = parseYearTermKey(termKey);
            scheduleRepository.deleteAllByFlowchartAndYearAndTerm(flowchart, yearTerm.year(), yearTerm.term());
        }
        scheduleRepository.saveAll(toPersist);

        if (flowchart.getCourseStatusMap() == null) {
            flowchart.setCourseStatusMap(new HashMap<>());
        }
        for (String courseIdent : importedCourseIdents) {
            flowchart.getCourseStatusMap().put(courseIdent, Status.IN_PROGRESS);
        }
        flowChartRepository.save(flowchart);

        return new ImportResult(
                rows.size(),
                toPersist.size(),
                linkedToCatalogCourses,
                importedCourseIdents.size(),
                touchedTermKeys.size(),
                "Imported schedule data and synced current-term courses.");
    }

    @Transactional(readOnly = true)
    public List<ClassScheduleEntry> getCurrentTermEntries(AppUser user) {
        Flowchart flowchart = flowchartService.getByUser(user);
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        Term term = inferCurrentTerm(now.getMonthValue());
        return scheduleRepository.findAllByFlowchartAndYearAndTermOrderByMeetingStartTimeAsc(flowchart, year, term);
    }

    @Transactional(readOnly = true)
    public List<ClassScheduleEntry> getTermEntries(AppUser user, int year, Term term) {
        Flowchart flowchart = flowchartService.getByUser(user);
        return scheduleRepository.findAllByFlowchartAndYearAndTermOrderByMeetingStartTimeAsc(flowchart, year, term);
    }

    private Semester createSemester(Flowchart flowchart, int year, Term term, String majorName) {
        Semester semester = new Semester();
        semester.setFlowchart(flowchart);
        semester.setYear(year);
        semester.setTerm(term);
        semester.setMajor(majorName);
        semester.setCourses(new ArrayList<>());
        flowchart.getSemesters().add(semester);
        return semester;
    }

    private void addCourseToSemesterIfMissing(Semester semester, Course course) {
        List<Course> courses = semester.getCourses();
        if (courses == null) {
            courses = new ArrayList<>();
            semester.setCourses(courses);
        }
        String normalizedTarget = normalizeIdent(course.getCourseIdent());
        boolean exists = courses.stream()
                .filter(Objects::nonNull)
                .map(Course::getCourseIdent)
                .filter(Objects::nonNull)
                .map(this::normalizeIdent)
                .anyMatch(normalizedTarget::equals);
        if (!exists) {
            courses.add(course);
            semesterRepository.save(semester);
        }
    }

    private String normalizeIdent(String ident) {
        if (ident == null) {
            return "";
        }
        return ident.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private String semesterKey(int year, Term term) {
        return year + "-" + (term == null ? "FALL" : term.name());
    }

    private YearTerm parseYearTermKey(String key) {
        String[] parts = key.split("-", 2);
        int year = Integer.parseInt(parts[0]);
        Term term = Term.valueOf(parts[1]);
        return new YearTerm(year, term);
    }

    private Term inferCurrentTerm(int month) {
        if (month <= 5) {
            return Term.SPRING;
        }
        if (month <= 8) {
            return Term.SUMMER;
        }
        return Term.FALL;
    }

    private record YearTerm(int year, Term term) {
    }

    public record ImportResult(
            int parsedRows,
            int importedRows,
            int linkedCatalogCourses,
            int distinctCoursesSynced,
            int touchedSemesters,
            String message) {
    }
}


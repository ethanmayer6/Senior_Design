package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.major.MajorNotFoundException;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import com.sdmay19.courseflow.semester.Term;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FlowchartService {

    private final CourseRepository courseRepository;
    private final MajorRepository majorRepository;
    private final FlowChartRepository flowChartRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    public FlowchartService(
            FlowChartRepository flowChartRepository,
            SemesterRepository semesterRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            MajorRepository majorRepository) {

        this.flowChartRepository = flowChartRepository;
        this.semesterRepository = semesterRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.majorRepository = majorRepository;
    }

    // ---------------------------------------------------------------------
    // CREATE FROM DTO (existing behavior)
    // ---------------------------------------------------------------------
    public Flowchart createFromDTO(FlowchartDTO dto) {
        Flowchart saved = buildFromDTO(dto);
        return flowChartRepository.save(saved);
    }

    public Flowchart buildFromDTO(FlowchartDTO dto) {
        List<Semester> semesters = getSemesters(dto);
        AppUser user = getUser(dto);
        Major major = getMajor(dto);
        return new Flowchart(
                dto.getTotalCredits(),
                dto.getCreditsSatisfied(),
                dto.getTitle(),
                user,
                semesters,
                dto.getCourseStatusMap(),
                major);
    }

    public List<Semester> getSemesters(FlowchartDTO dto) {
        return semesterRepository.findAllById(dto.getSemesterIdents());
    }

    public AppUser getUser(FlowchartDTO dto) {
        return userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User with id " + dto.getUserId() + " not found"));
    }

    public Major getMajor(FlowchartDTO dto) {
        return majorRepository.findByName(dto.getMajorName())
                .orElseThrow(() -> new MajorNotFoundException("Major with name: " + dto.getMajorName() + " not found"));
    }

    // ---------------------------------------------------------------------
    // NEW: CREATE FLOWCHART FROM PROGRESS (used by importer)
    // ---------------------------------------------------------------------
    /**
     * Creates a new Flowchart for the given user and major, using the
     * courseStatusMap and a grouping of courses by academicPeriod string,
     * e.g. "FALL2022", "SPRING2021", etc.
     *
     * Each academic period becomes a Semester block containing the courses
     * the student took in that period.
     */
    public Flowchart createFromProgress(
            AppUser user,
            Major major,
            Map<String, Status> courseStatusMap,
            Map<String, List<Course>> coursesByAcademicPeriod) {

        // Flatten all unique courses from the map to compute credits
        Set<Course> allCourses = new HashSet<>();
        for (List<Course> list : coursesByAcademicPeriod.values()) {
            allCourses.addAll(list);
        }

        int totalCredits = allCourses.stream()
                .mapToInt(Course::getCredits)
                .sum();

        int satisfiedCredits = totalCredits; // all in transcript are completed

        Flowchart flowchart = new Flowchart(
                totalCredits,
                satisfiedCredits,
                "Imported Progress Report",
                user,
                new ArrayList<>(),
                courseStatusMap,
                major);

        List<Semester> semesterEntities = new ArrayList<>();

        // Create Semester entities from each academic period key
        // ------------------------------------------------------------
        // MERGE SEMESTERS WITH SAME TERM/YEAR (fix duplicate SPRING 2025)
        // ------------------------------------------------------------
        Map<String, List<Course>> merged = new HashMap<>();

        for (Map.Entry<String, List<Course>> entry : coursesByAcademicPeriod.entrySet()) {
            String period = entry.getKey();
            List<Course> courses = entry.getValue();

            if (period == null || period.isBlank())
                continue;

            // Normalize first → gives us correct YEAR + TERM
            Semester normalized = buildSemesterFromPeriod(
                    period,
                    flowchart,
                    courses,
                    major.getName());

            // Canonical merge key, e.g. "SPRING-2025"
            String mergeKey = normalized.getTerm().name() + "-" + normalized.getYear();

            merged.computeIfAbsent(mergeKey, k -> new ArrayList<>())
                    .addAll(courses);
        }

        // ------------------------------------------------------------
        // Now build actual Semester entities from merged periods
        // ------------------------------------------------------------
        for (Map.Entry<String, List<Course>> entry : merged.entrySet()) {
            String key = entry.getKey(); // e.g. "SPRING-2025"
            List<Course> mergedCourses = entry.getValue();

            String[] parts = key.split("-");
            Term term = Term.valueOf(parts[0]);
            int year = Integer.parseInt(parts[1]);

            Semester sem = new Semester(year, term, major.getName(), flowchart, mergedCourses);
            semesterEntities.add(sem);
        }

        // Sort semesters chronologically
        semesterEntities.sort((a, b) -> {
            int rankA = semesterRank(a.getYear(), a.getTerm());
            int rankB = semesterRank(b.getYear(), b.getTerm());
            return Integer.compare(rankA, rankB);
        });

        flowchart.setSemesters(semesterEntities);

        // Cascade from Flowchart → Semesters will persist them
        return flowChartRepository.save(flowchart);
    }

    private Semester buildSemesterFromPeriod(
            String period,
            Flowchart flowchart,
            List<Course> courses,
            String majorName) {

        String upper = period.toUpperCase(Locale.ROOT);

        // ---------- WINTER SESSION SPECIAL HANDLING ----------
        if (upper.contains("WINTER")) {

            // Extract the SECOND YEAR from a date range:
            // Example: "(12/23/2024-01/17/2025)" → 2025
            int springYear = 0;

            Matcher matcher = Pattern.compile("(\\d{4})\\)").matcher(period);
            if (matcher.find()) {
                springYear = Integer.parseInt(matcher.group(1));
            }

            // Fallback if parsing fails
            if (springYear == 0) {
                springYear = extractYearFallback(period);
            }

            return new Semester(springYear, Term.SPRING, majorName, flowchart, courses);
        }

        // ---------- NORMAL SEMESTER HANDLING ----------
        // Extract year (take last 4-digit year)
        Matcher yearMatcher = Pattern.compile("(\\d{4})").matcher(period);
        int year = 0;
        while (yearMatcher.find()) {
            year = Integer.parseInt(yearMatcher.group(1));
        }

        // Extract term name
        Term term = Term.FALL;
        if (upper.contains("SPRING"))
            term = Term.SPRING;
        else if (upper.contains("SUMMER"))
            term = Term.SUMMER;
        else if (upper.contains("FALL"))
            term = Term.FALL;

        return new Semester(year, term, majorName, flowchart, courses);
    }

    // Fallback if Winter regex fails (should be rare)
    private int extractYearFallback(String period) {
        Matcher yearMatcher = Pattern.compile("(\\d{4})").matcher(period);
        int lastYear = 0;
        while (yearMatcher.find()) {
            lastYear = Integer.parseInt(yearMatcher.group(1));
        }
        return lastYear;
    }

    private int semesterRank(int year, Term term) {
        int base = year * 10;
        int offset = switch (term) {
            case SPRING -> 1;
            case SUMMER -> 2;
            case FALL -> 3;
            default -> 9;
        };
        return base + offset;
    }

    // ---------------------------------------------------------------------
    // READ
    // ---------------------------------------------------------------------
    public Flowchart getById(long id) {
        return flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + id + " not Found."));
    }

    public List<Course> getCourseByStatus(long flowchartId, Status status) {
        Flowchart flowchart = getById(flowchartId);
        Map<String, Status> courseMap = flowchart.getCourseStatusMap();
        List<Course> result = new ArrayList<>();

        for (Map.Entry<String, Status> entry : courseMap.entrySet()) {
            String courseIdent = entry.getKey();
            Status curStatus = entry.getValue();

            if (status == curStatus) {
                Course course = courseRepository.findByCourseIdent(courseIdent)
                        .orElseThrow(
                                () -> new CourseNotFoundException("Course with ident " + courseIdent + " not found."));
                result.add(course);
            }
        }
        return result;
    }

    // ---------------------------------------------------------------------
    // UPDATE
    // ---------------------------------------------------------------------
    public Flowchart update(long id, FlowchartDTO flowchartDTO) {
        Flowchart flowchart = flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id: " + id + " not found."));

        if (flowchartDTO.getMajorName() != null && !flowchartDTO.getMajorName().isEmpty()) {
            Major major = majorRepository.findByName(flowchartDTO.getMajorName())
                    .orElseThrow(() -> new MajorNotFoundException(
                            "Major with " + flowchartDTO.getMajorName() + " not found."));
            flowchart.setMajor(major);
        }
        if (flowchartDTO.getUserId() > 0) {
            AppUser user = userRepository.findById(flowchartDTO.getUserId())
                    .orElseThrow(() -> new UserNotFoundException("User with Id: " + id + " not found."));
            flowchart.setUser(user);
        }
        if (flowchartDTO.getSemesterIdents() != null && !flowchartDTO.getSemesterIdents().isEmpty()) {
            List<Semester> semesters = semesterRepository.findAllById(flowchartDTO.getSemesterIdents());
            if (!semesters.isEmpty()) {
                flowchart.setSemesters(semesters);
            }
        }
        if (flowchartDTO.getTotalCredits() > 0) {
            flowchart.setTotalCredits(flowchartDTO.getTotalCredits());
        }
        if (flowchartDTO.getCreditsSatisfied() > 0) {
            flowchart.setCreditsSatisfied(flowchartDTO.getCreditsSatisfied());
        }
        if (flowchartDTO.getTitle() != null && !flowchartDTO.getTitle().isEmpty()) {
            flowchart.setTitle(flowchartDTO.getTitle());
        }
        if (flowchartDTO.getCourseStatusMap() != null && !flowchartDTO.getCourseStatusMap().isEmpty()) {
            flowchart.setCourseStatusMap(flowchartDTO.getCourseStatusMap());
        }
        return flowchart;
    }

    @Transactional
    public void addCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        Map<String, Status> map = flowchart.getCourseStatusMap();
        if (map.containsKey(ident)) {
            throw new IllegalArgumentException("Course already mapped in flowchart");
        }
        map.put(ident, status);
    }

    @Transactional
    public void removeCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in map");
        }
        map.remove(ident);
    }

    @Transactional
    public void updateCourseStatus(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in status map");
        }
        map.put(ident, status);
    }

    public Flowchart getByUser(AppUser user) {
        return flowChartRepository.findByUser(user)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with user not found"));
    }

    // ---------------------------------------------------------------------
    // DELETE
    // ---------------------------------------------------------------------
    @Transactional
    public void deleteById(long id) {
        Flowchart flowchart = flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + id + " not found."));

        // Clear semesters (orphans will be removed)
        List<Semester> sems = flowchart.getSemesters();
        if (sems != null) {
            sems.clear();
            flowchart.setSemesters(sems);
        }

        // Clear courseStatusMap
        Map<String, Status> map = flowchart.getCourseStatusMap();
        if (map != null) {
            map.clear();
            flowchart.setCourseStatusMap(map);
        }

        // Save the cleared entity
        flowChartRepository.save(flowchart);

        // Now safe to delete
        flowChartRepository.deleteById(id);
    }

    public List<Flowchart> getAll() {
        return flowChartRepository.findAll();
    }
}
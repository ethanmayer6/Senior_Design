package com.sdmay19.courseflow.semester;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.course.CourseService;
import com.sdmay19.courseflow.exception.course.CourseCreationException;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.semester.SemesterNotFoundException;
import com.sdmay19.courseflow.flowchart.*;
import org.springframework.stereotype.Service;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SemesterService {

    // TODO - ADD A JSON IGNORE TO RELATIONSHIP TO PREVENT RECURSIVE ISSUE

    private final SemesterRepository semesterRepository;
    private final FlowChartRepository flowChartRepository;
    private final CourseRepository courseRepository;
    private final CourseService courseService;
    private final Set<Term> termSet;
    private final FlowchartService flowchartService;

    public SemesterService (SemesterRepository semesterRepository, FlowChartRepository flowChartRepository, CourseRepository courseRepository, CourseService courseService, FlowchartService flowchartService) {
        this.semesterRepository = semesterRepository;
        this.flowChartRepository = flowChartRepository;
        this.courseRepository = courseRepository;
        this.courseService = courseService;
        this.termSet = EnumSet.allOf(Term.class);
        this.flowchartService = flowchartService;
    }

    // CREATE
    public Semester createFromDTO(SemesterDTO dto) {
        Semester saved = buildFromDTO(dto);
        return semesterRepository.save(saved);
    }
    public Semester buildFromDTO(SemesterDTO dto) {
        return new Semester(dto.getYear(), dto.getTerm(), dto.getMajor(), getFlowchart(dto), getCourses(dto));
    }
    public Flowchart getFlowchart(SemesterDTO dto) {
        System.out.println("THIS IS THE ID: " + dto.getFlowchartId());
        return flowChartRepository.findById(dto.getFlowchartId())
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart not found"));
    }
    public List<Course> getCourses(SemesterDTO dto) {
        return courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
    }

    // READ
    public Semester getById(long id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new SemesterNotFoundException("Semester with Id: " + id + " not found."));
    }
    public List<Course> getSemesterCourses(long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new SemesterNotFoundException("Semester with IdL " + id + " not found."));

        return semester.getCourses();
    }
    public List<Semester> getAll() {
        return semesterRepository.findAll();
    }

    // UPDATE
    // FOR FREQUENT AND PARTIAL UPDATES
    public Semester addCourse(long semesterId, String courseIdent) {
        Semester semester = getById(semesterId);
        Course course = courseService.getByCourseIdent(courseIdent);
        if (course == null) {
            throw new CourseNotFoundException("Failed to remove course " + courseIdent + " From Semester. Course not found.");
        }
        String normalizedIdent = normalizeCourseIdent(course.getCourseIdent());
        List<Course> semesterCourses = semester.getCourses() == null ? List.of() : semester.getCourses();
        boolean alreadyInSemester = semesterCourses.stream()
                .filter(c -> c != null && c.getCourseIdent() != null)
                .map(Course::getCourseIdent)
                .map(this::normalizeCourseIdent)
                .anyMatch(existing -> existing.equals(normalizedIdent));
        if (alreadyInSemester) {
            throw new CourseCreationException("Course " + course.getCourseIdent() + " already exists in this semester.");
        }

        validateGuardrails(semester, course);

        semester.addCourse(course);
        flowchartService.addCourse(semester.getFlowchart().getId(), new CourseMapRequest(Status.UNFULFILLED, courseIdent, "Add"));
        return semesterRepository.save(semester);
    }

    public Semester removeCourse(long semesterId, String courseIdent) {
        Semester semester = getById(semesterId);
        Course course = courseService.getByCourseIdent(courseIdent);
        if (course == null) {
            throw new CourseNotFoundException("Failed to remove course " + courseIdent + " From Semester. Course not found.");
        }
        semester.removeCourse(course);
        flowchartService.removeCourse(semester.getFlowchart().getId(), new CourseMapRequest(Status.UNFULFILLED, courseIdent, "Remove") );
        return semesterRepository.save(semester);
    }
    // FOR THE FULL SEMESTER OBJECT

    public Semester updateSemester(long semesterId, SemesterDTO dto) {
        Semester semester = getById(semesterId);

        if (dto.getYear() > 0) {
            semester.setYear(dto.getYear());
        }
        if (termSet.contains(dto.getTerm())) {
            semester.setTerm(dto.getTerm());
        }
        if (dto.getMajor() != null && !dto.getMajor().isBlank()) {
            semester.setMajor(dto.getMajor());
        }
        if (dto.getFlowchartId() > 0) {
            Flowchart flowchart = flowChartRepository.findById(dto.getFlowchartId())
                    .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with id: " + dto.getFlowchartId() + " not found."));
            semester.setFlowchart(flowchart);
        }
        if (dto.getCourseIdents() != null && !dto.getCourseIdents().isEmpty()) {
            List<Course> courses = courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
            semester.setCourses(courses);
        }

        return semesterRepository.save(semester);
    }
    // DELETE

    public void deleteById(long id) {
        semesterRepository.deleteById(id);
    }

    private void validateGuardrails(Semester semester, Course course) {
        Set<String> prerequisites = extractPrerequisites(course);
        Set<String> corequisites = extractCorequisites(course);

        Map<String, Status> statusMap = semester.getFlowchart().getCourseStatusMap();
        Set<String> satisfiedFromStatusMap = new HashSet<>();
        if (statusMap != null) {
            for (Map.Entry<String, Status> entry : statusMap.entrySet()) {
                if (entry.getValue() == Status.COMPLETED || entry.getValue() == Status.IN_PROGRESS) {
                    satisfiedFromStatusMap.add(normalizeCourseIdent(entry.getKey()));
                }
            }
        }

        Set<String> currentSemesterIdents = new HashSet<>();
        List<Course> currentSemesterCourses = semester.getCourses() == null ? List.of() : semester.getCourses();
        for (Course existing : currentSemesterCourses) {
            if (existing != null && existing.getCourseIdent() != null) {
                currentSemesterIdents.add(normalizeCourseIdent(existing.getCourseIdent()));
            }
        }

        Set<String> missingPrereqs = new HashSet<>();
        for (String prereq : prerequisites) {
            String normalizedPrereq = normalizeCourseIdent(prereq);
            if (!normalizedPrereq.isBlank() && !satisfiedFromStatusMap.contains(normalizedPrereq)) {
                missingPrereqs.add(prereq);
            }
        }

        Set<String> missingCoreqs = new HashSet<>();
        for (String coreq : corequisites) {
            String normalizedCoreq = normalizeCourseIdent(coreq);
            if (normalizedCoreq.isBlank()) {
                continue;
            }
            boolean satisfied = satisfiedFromStatusMap.contains(normalizedCoreq) || currentSemesterIdents.contains(normalizedCoreq);
            if (!satisfied) {
                missingCoreqs.add(coreq);
            }
        }

        if (!missingPrereqs.isEmpty() || !missingCoreqs.isEmpty()) {
            List<String> reasons = new java.util.ArrayList<>();
            if (!missingPrereqs.isEmpty()) {
                reasons.add("Missing prerequisites: " + String.join(", ", missingPrereqs) + ".");
            }
            if (!missingCoreqs.isEmpty()) {
                reasons.add("Missing co-requisites (must already be in this semester or completed/in progress): "
                        + String.join(", ", missingCoreqs) + ".");
            }
            throw new CourseCreationException(
                    "Cannot add " + course.getCourseIdent() + " because it is blocked by validation guardrails. "
                            + String.join(" ", reasons));
        }
    }

    private Set<String> extractPrerequisites(Course course) {
        Set<String> result = new HashSet<>();

        if (course.getPrerequisites() != null) {
            for (String prereq : course.getPrerequisites()) {
                if (prereq != null && !prereq.isBlank()) {
                    result.add(prereq.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "_"));
                }
            }
        }

        // Fallback for courses where structured prerequisite ids are not populated.
        if (!result.isEmpty()) {
            return result;
        }

        String prereqText = course.getPrereq_txt();
        if (prereqText == null || prereqText.isBlank()) {
            return result;
        }

        String normalizedText = prereqText.toUpperCase(Locale.ROOT);
        String[] segments = normalizedText.split("[.;\\n]");
        Pattern coursePattern = Pattern.compile("\\b([A-Z]{2,8}(?:\\s+[A-Z]{1,3})?)\\s*[-_]?\\s*(\\d{4})\\b");

        for (String segment : segments) {
            if (segment == null || segment.isBlank()) {
                continue;
            }
            String trimmedSegment = segment.trim();
            if (isCorequisiteSegment(trimmedSegment)) {
                continue;
            }

            Matcher matcher = coursePattern.matcher(trimmedSegment);
            while (matcher.find()) {
                String rawPrefix = matcher.group(1) == null ? "" : matcher.group(1);
                String prefix = rawPrefix.replaceAll("[^A-Z]", "");
                if (!prefix.isBlank()) {
                    result.add(prefix + "_" + matcher.group(2));
                }
            }
        }
        return result;
    }

    private Set<String> extractCorequisites(Course course) {
        Set<String> result = new HashSet<>();
        String prereqText = course.getPrereq_txt();
        if (prereqText == null || prereqText.isBlank()) {
            return result;
        }

        String normalizedText = prereqText.toUpperCase(Locale.ROOT);
        String[] segments = normalizedText.split("[.;\\n]");
        Pattern coursePattern = Pattern.compile("\\b([A-Z]{2,8}(?:\\s+[A-Z]{1,3})?)\\s*[-_]?\\s*(\\d{4})\\b");

        for (String segment : segments) {
            if (segment == null || segment.isBlank()) {
                continue;
            }
            String trimmedSegment = segment.trim();
            if (!isCorequisiteSegment(trimmedSegment)) {
                continue;
            }

            Matcher matcher = coursePattern.matcher(trimmedSegment);
            while (matcher.find()) {
                String rawPrefix = matcher.group(1) == null ? "" : matcher.group(1);
                String prefix = rawPrefix.replaceAll("[^A-Z]", "");
                if (!prefix.isBlank()) {
                    result.add(prefix + "_" + matcher.group(2));
                }
            }
        }
        return result;
    }

    private boolean isCorequisiteSegment(String segmentUpper) {
        return segmentUpper.contains("CO-REQ")
                || segmentUpper.contains("CO REQ")
                || segmentUpper.contains("COREQ")
                || segmentUpper.contains("CONCURRENT")
                || segmentUpper.contains("ENROLLMENT IN")
                || segmentUpper.contains("ENROLLED IN")
                || segmentUpper.contains("TAKEN WITH");
    }

    private String normalizeCourseIdent(String ident) {
        if (ident == null) {
            return "";
        }
        return ident.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }
}

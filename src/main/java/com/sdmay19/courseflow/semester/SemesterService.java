package com.sdmay19.courseflow.semester;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.course.CourseService;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.semester.SemesterNotFoundException;
import com.sdmay19.courseflow.flowchart.*;
import org.springframework.stereotype.Service;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    
    // UPDATE
    // FOR FREQUENT AND PARTIAL UPDATES
    public Semester addCourse(long semesterId, String courseIdent) {
        Semester semester = getById(semesterId);
        Course course = courseService.getByCourseIdent(courseIdent);
        if (course == null) {
            throw new CourseNotFoundException("Failed to remove course " + courseIdent + " From Semester. Course not found.");
        }
        if (semester == null) {
            throw new SemesterNotFoundException("Failed to find semester " + semesterId);
        }
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
        if (semester == null) {
            throw new SemesterNotFoundException("Failed to find semester " + semesterId);
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
        if (!dto.getMajor().isEmpty()) {
            semester.setMajor(dto.getMajor());
        }
        if (dto.getFlowchartId() > 0) {
            // TODO - ADD CUSTOM FLOWCHART ERROR
            Flowchart flowchart = flowChartRepository.findById(dto.getFlowchartId())
                    .orElseThrow();
            semester.setFlowchart(flowchart);
        }
        if (!dto.getCourseIdents().isEmpty()) {
            List<Course> courses = courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
            semester.setCourses(courses);
        }

        return semesterRepository.save(semester);
    }

    // DELETE
    public void deleteById(long id) {
        semesterRepository.deleteById(id);
    }

}

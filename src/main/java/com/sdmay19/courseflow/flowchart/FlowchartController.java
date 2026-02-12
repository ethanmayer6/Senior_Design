package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.CourseMapRequest;
import com.sdmay19.courseflow.semester.CourseUpdateRequest;
import com.sdmay19.courseflow.semester.Semester;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/flowchart")
public class FlowchartController {

    private final FlowchartService flowchartService;

    public FlowchartController(FlowchartService flowchartService) {
        this.flowchartService = flowchartService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Flowchart> createFlowchart(@RequestBody FlowchartDTO dto) {
        Flowchart flowchart = flowchartService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(flowchart);
    }

    // READ
    @GetMapping("/user")
    public FlowchartResponse getMyFlowchart(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByUser(user);
        return FlowchartResponse.from(flowchart);
    }

    @GetMapping("/id/{id}")
    public Flowchart getById(@PathVariable long id) {
        return flowchartService.getById(id);
    }

    @GetMapping("/courses/{id}/{status}")
    public List<Course> getCourseByStatus(@PathVariable long id, @PathVariable Status status) {
        return flowchartService.getCourseByStatus(id, status);
    }

    @GetMapping("/getall")
    public List<Flowchart> getAllFlowCharts() {
        return flowchartService.getAll();
    }

    public record CourseResponse(
            long id,
            String name,
            String courseIdent,
            int credits,
            Set<String> prerequisites,
            String description,
            String offered) {
        static CourseResponse from(Course c) {
            return new CourseResponse(
                    c.getId(),
                    c.getName(),
                    c.getCourseIdent(),
                    c.getCredits(),
                    c.getPrerequisites(),
                    c.getDescription(),
                    c.getOffered());
        }
    }

    public record SemesterResponse(
            long id,
            int year,
            String term,
            String major,
            List<CourseResponse> courses) {
        static SemesterResponse from(Semester s) {
            List<CourseResponse> courses = new ArrayList<>();
            if (s.getCourses() != null) {
                for (Course c : s.getCourses()) {
                    courses.add(CourseResponse.from(c));
                }
            }
            return new SemesterResponse(
                    s.getId(),
                    s.getYear(),
                    s.getTerm() == null ? null : s.getTerm().name(),
                    s.getMajor(),
                    courses);
        }
    }

    public record FlowchartResponse(
            long id,
            int totalCredits,
            int creditsSatisfied,
            String title,
            Map<String, Status> courseStatusMap,
            String majorName,
            List<SemesterResponse> semesters) {
        static FlowchartResponse from(Flowchart f) {
            List<SemesterResponse> semesters = new ArrayList<>();
            if (f.getSemesters() != null) {
                for (Semester s : f.getSemesters()) {
                    semesters.add(SemesterResponse.from(s));
                }
            }
            return new FlowchartResponse(
                    f.getId(),
                    f.getTotalCredits(),
                    f.getCreditsSatisfied(),
                    f.getTitle(),
                    f.getCourseStatusMap(),
                    f.getMajor() == null ? null : f.getMajor().getName(),
                    semesters);
        }
    }

    // UPDATE
    @PatchMapping("/update/{id}/course")
    public Flowchart updateCourseMap(@PathVariable long id, @RequestBody CourseMapRequest req) {
        if (req.getOperation().equals("UPDATE")) {
            flowchartService.updateCourseStatus(id, req);
        }
        if (req.getOperation().equals("ADD")) {
            flowchartService.addCourse(id, req);
        }
        if (req.getOperation().equals("REMOVE")) {
            flowchartService.removeCourse(id, req);
        }

        Flowchart updated = flowchartService.getById(id);
        return ResponseEntity.ok(updated).getBody();
    }

    @PutMapping("/update/{id}")
    public Flowchart updateFlowchart(@PathVariable long id, @RequestBody FlowchartDTO flowchartDTO) {
        return flowchartService.update(id, flowchartDTO);
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable long id) {
        flowchartService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.CourseMapRequest;
import com.sdmay19.courseflow.semester.CourseUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flowchart")
public class FlowchartController {

    private final FlowchartService flowchartService;

    public FlowchartController (FlowchartService flowchartService) {
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
    public Flowchart getByUserId(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return flowchartService.getByUser(user);
    }
    @GetMapping("/id/{id}")
    public Flowchart getById(@PathVariable long id) {
        return flowchartService.getById(id);
    }
    @GetMapping("/completed/{id}/{status}")
    public List<Course> getCourseByStatus(long flowchartId, Status status) {
        return flowchartService.getCourseByStatus(flowchartId, status);
    }

    // UPDATE
    @PatchMapping("/update/{id}/course")
    public Flowchart updateCourseMap(@PathVariable long id, @RequestBody CourseMapRequest req) {
        if(req.getOperation().equals("Update")) {
            flowchartService.updateCourseStatus(id, req);
        }
        if(req.getOperation().equals("Add")) {
            flowchartService.addCourse(id, req);
        }
        if(req.getOperation().equals("Remove")) {
            flowchartService.removeCourse(id, req);
        }

        Flowchart updated = flowchartService.getById(id);
        return ResponseEntity.ok(updated).getBody();
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable long id) {
        flowchartService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

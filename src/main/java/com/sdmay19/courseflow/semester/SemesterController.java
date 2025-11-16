package com.sdmay19.courseflow.semester;


import com.sdmay19.courseflow.course.Course;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.parameters.P;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/semester")
public class SemesterController {

    private final SemesterService semesterService;

    public SemesterController(SemesterService semesterService) {
        this.semesterService = semesterService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Semester> createSemester(@RequestBody SemesterDTO dto) {
        Semester semester = semesterService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(semester);
    }

    // READ
    @GetMapping("/id/{id}")
    public ResponseEntity<Semester> getSemesterById(@PathVariable long id) {
        return ResponseEntity.ok(semesterService.getById(id));
    }
    @GetMapping("/courses/{id}")
    public ResponseEntity<List<Course>> getSemesterCourses(@PathVariable long id) {
        return ResponseEntity.ok(semesterService.getSemesterCourses(id));
    }
    @GetMapping("/getall")
    public ResponseEntity<List<Semester>> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAll());
    }

    // UPDATE
    @PatchMapping("/update/{id}/courses") // Id is Semester Id
    public ResponseEntity<Semester> updateSemesterCourses(@PathVariable long id, @RequestBody CourseUpdateRequest req) {
        if (req.getOperation().equals("ADD")) {
            return ResponseEntity.ok(semesterService.addCourse(id, req.getCourseIdent()));
        }
        else if (req.getOperation().equals("REMOVE")) {
            return ResponseEntity.ok(semesterService.removeCourse(id, req.getCourseIdent()));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
    }
    @PutMapping("/update/{ident}/all")
    public ResponseEntity<Semester> updateSemester(@PathVariable long semesterId, @RequestBody SemesterDTO dto) {
        return ResponseEntity.ok(semesterService.updateSemester(semesterId, dto));
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteSemester(@RequestBody long id) {
        semesterService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}

package com.sdmay19.courseflow.semester;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    // UPDATE
    @PatchMapping("/update/{ident}/courses")
    public ResponseEntity<Semester> updateSemesterCourses(@PathVariable long semesterId, @RequestBody CourseUpdateRequest req) {
        if (req.getOperation().equals("ADD")) {
            return ResponseEntity.ok(semesterService.addCourse(semesterId, req.getCourseIdent()));
        }
        else if (req.getOperation().equals("REMOVE")) {
            return ResponseEntity.ok(semesterService.removeCourse(semesterId, req.getCourseIdent()));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
    }
    @PutMapping("/update/{ident}/all")
    public ResponseEntity<Semester> updateSemester(@PathVariable long semesterId, @RequestBody SemesterDTO dto) {
        return ResponseEntity.ok(semesterService.updateSemester(semesterId, dto));
    }

    // DELETE
    @DeleteMapping("/delete/")
    public ResponseEntity<Void> deleteSemester(@RequestBody long id) {
        semesterService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}

package com.sdmay19.courseflow.course;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private CourseService courseService;

    // CREATE
    @PostMapping
    public ResponseEntity<Course> create(@RequestBody Course course) {
        Course saved = courseService.create(course);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // READ
    @GetMapping("/{id}")
    public ResponseEntity<Course> getById(@PathVariable long id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    // READ
    @GetMapping("/{courseIdent}")
    public ResponseEntity<Course> getByCourseIdent(@PathVariable String courseIdent) {
        return ResponseEntity.ok(courseService.getCourseByCourseIdent(courseIdent));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Course> update(@PathVariable long id, @RequestBody CourseUpdator updates) {
        return ResponseEntity.ok(courseService.updateCourse(id, updates));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        courseService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
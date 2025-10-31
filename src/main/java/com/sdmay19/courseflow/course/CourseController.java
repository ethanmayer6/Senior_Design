package com.sdmay19.courseflow.course;

import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    // CREATE
    @PostMapping
    public ResponseEntity<Course> create(Authentication auth, @RequestBody Course course) {
        // Add in Auth Check here?

        Course saved = courseService.create(course);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // READ
    @GetMapping("/{id}")
    public ResponseEntity<Course> getById(@PathVariable long id) {
        return ResponseEntity.ok(courseService.getById(id));
    }
    @GetMapping("/{courseIdent}")
    public ResponseEntity<Course> getByCourseIdent(@PathVariable String courseIdent) {
        return ResponseEntity.ok(courseService.getByCourseIdent(courseIdent));
    }
    @GetMapping("/{name}")
    public ResponseEntity<Course> getByName(@PathVariable String name) {
        return ResponseEntity.ok(courseService.getByName(name));
    }
    @GetMapping("/all")
    public ResponseEntity<List<Course>> getAll() {
        return ResponseEntity.ok(courseService.getAllCourse());
    }
    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Course> update(@PathVariable long id, @RequestBody CourseUpdater updates) {
        return ResponseEntity.ok(courseService.updateCourse(id, updates));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        courseService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
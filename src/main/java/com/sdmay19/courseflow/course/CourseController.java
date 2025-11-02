package com.sdmay19.courseflow.course;

import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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
    @PostMapping("/create")
    public ResponseEntity<Course> create(@RequestBody Course course) { // ADD AUTH CHECK??
        Course saved = courseService.create(course);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
    @PostMapping("/bulk-create")
    public ResponseEntity<List<Course>> createMultiple(@RequestBody List<Course> courses) {
        System.out.println("Creating" + courses);
        List<Course> createdCourses = courseService.createAll(courses);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCourses);
    }

    // READ
    @GetMapping("/ident/{id}")
    public ResponseEntity<Course> getById(@PathVariable long id) {
        return ResponseEntity.ok(courseService.getById(id));
    }
    @GetMapping("/courseIdent/{courseIdent}")
    public ResponseEntity<Course> getByCourseIdent(@PathVariable String courseIdent) {
        return ResponseEntity.ok(courseService.getByCourseIdent(courseIdent));
    }
    @GetMapping("name/{name}")
    public ResponseEntity<Course> getByName(@PathVariable String name) {
        return ResponseEntity.ok(courseService.getByName(name));
    }
    @GetMapping("/all")
    public ResponseEntity<List<Course>> getAll() {
        return ResponseEntity.ok(courseService.getAllCourse());
    }

    // UPDATE
    @PutMapping
    public ResponseEntity<Course> update(@RequestBody CourseUpdater updates) {
        return ResponseEntity.ok(courseService.updateCourse(updates));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        courseService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
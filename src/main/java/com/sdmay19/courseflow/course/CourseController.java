package com.sdmay19.courseflow.course;

import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    @GetMapping("/page")
    public ResponseEntity<List<Course>> getPage(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size){
        return ResponseEntity.ok(courseService.getPage(page, size));
    }
    @GetMapping("/search")
    public ResponseEntity<List<Course>> searchCourse(@RequestParam String searchTerm){
        return ResponseEntity.ok(courseService.searchCourse(searchTerm));
    }
    @GetMapping("/filter")
    public ResponseEntity<List<Course>> filterCourse(@RequestParam(required = false) String level, @RequestParam(required = false) String offeredTerm, @RequestParam(required = false) String department, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size){
        return ResponseEntity.ok(courseService.filterCourse(level, offeredTerm, department, page, size));
    }

    // UPDATE
    @PutMapping("update/{id}")
    public ResponseEntity<Course> update(@PathVariable long id, @RequestBody CourseUpdater updates) {
        return ResponseEntity.ok(courseService.updateCourse(id, updates));
    }

    // DELETE
    @DeleteMapping("delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        courseService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
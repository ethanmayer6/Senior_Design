package com.sdmay19.courseflow.major;

import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/majors")
public class MajorController {

    @Autowired
    private MajorService majorService;

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Major> createMajor(Authentication auth, @RequestBody Major major) {
        // Potentially add an Admin check here for the auth being passed in

        Major createdMajor = majorService.createMajor(major);
        return ResponseEntity.ok(createdMajor);
    }

    // READ
    @GetMapping
    public ResponseEntity<List<Major>> getAllMajors() {
        return ResponseEntity.ok(majorService.getAllMajors());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Major> getMajorById(@PathVariable long id) {
        return ResponseEntity.ok(majorService.getMajorById(id));
    }
    @GetMapping("/{name}")
    public ResponseEntity<Major> getMajorByName(@PathVariable String name) {
        return ResponseEntity.ok(majorService.getMajorByName(name));
    }

    // EDIT
    @PutMapping
    public ResponseEntity<Major> updateMajor(Authentication auth, @RequestBody Major major) {
        // Potentially add an Admin check here for the auth being passed in

        return ResponseEntity.ok(major);
    }

    // DELETE
    @DeleteMapping
    public ResponseEntity<Void> deleteMajor(Authentication auth, @RequestBody Major major) {
        // ADD DELETE HERE

        return ResponseEntity.noContent().build();
    }
}

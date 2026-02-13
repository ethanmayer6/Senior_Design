package com.sdmay19.courseflow.major;

import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.data.jpa.domain.AbstractPersistable_.id;

@RestController
@RequestMapping("/api/majors")
public class MajorController {

    @Autowired
    private MajorService majorService;
    @Autowired
    private MajorRepository majorRepository;

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Major> createMajor(Authentication auth, @RequestBody MajorDTO dto) {
        // Potentially add an Admin check here for the auth being passed in
        Major saved = majorService.createMajor(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // READ
    @GetMapping("/getall")
    public ResponseEntity<List<Major>> getAllMajors() {
        return ResponseEntity.ok(majorService.getAllMajors());
    }
    @GetMapping("/names")
    public ResponseEntity<List<String>> getMajorNames() {
        return ResponseEntity.ok(majorService.getAllMajorNames());
    }
    @GetMapping("ident/{id}")
    public ResponseEntity<Major> getMajorById(@PathVariable long id) {
        return ResponseEntity.ok(majorService.getMajorById(id));
    }
    @GetMapping("name/{name}")
    public ResponseEntity<Major> getMajorByName(@PathVariable String name) {
        return ResponseEntity.ok(majorService.getMajorByName(name));
    }

    // UPDATE
    @PutMapping("/update/{id}")
    public ResponseEntity<Major> updateMajor(Authentication auth, @PathVariable long id, @RequestBody MajorDTO majorDTO) {
        // Potentially add an Admin check here for the auth being passed in
        Major major = majorService.updateMajor(id, majorDTO);
        return ResponseEntity.ok(major);
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteMajor(Authentication auth, @PathVariable long id) {
        // ADD DELETE HERE
        majorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

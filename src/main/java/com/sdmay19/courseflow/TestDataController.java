package com.sdmay19.courseflow;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/testdata")
public class TestDataController {

    @Autowired
    private TestDataRepository repository;

    // POST /testdata — create a new row
    @PostMapping
    @PreAuthorize("permitAll()")
    public TestData createRow(@RequestBody TestData data) {
        return repository.save(data);
    }

    // GET /testdata — get all rows
    @GetMapping
    @PreAuthorize("permitAll()")
    public List<TestData> getAllRows() {
        return repository.findAll();
    }
}
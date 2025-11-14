package com.sdmay19.courseflow.semester_requirement;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/semesterrequirement")
public class SemesterRequirementController {

    private final SemesterRequiremetService semesterRequiremetService;

    public SemesterRequirementController(SemesterRequiremetService semesterRequiremetService) {
        this.semesterRequiremetService = semesterRequiremetService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<SemesterRequirement> createSemesterRequirement(@RequestBody SemesterRequirementDTO dto) {
        SemesterRequirement semesterRequirement = semesterRequiremetService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(semesterRequirement);
    }

    // READ

    // UPDATE

    // DELETE
}

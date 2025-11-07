package com.sdmay19.courseflow.degree_requirement;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/degreerequirement")
public class DegreeRequirementController {

    private final DegreeRequirementService degreeRequirementService;

    public DegreeRequirementController(DegreeRequirementService degreeRequirementService) {
        this.degreeRequirementService = degreeRequirementService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<DegreeRequirement> createDegreeRequirement(@RequestBody DegreeRequirementDTO dto) {
        DegreeRequirement saved = degreeRequirementService.creatFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

}

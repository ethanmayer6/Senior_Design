package com.sdmay19.courseflow.degree_requirement;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // READ
    @GetMapping("/id/{id}")
    public ResponseEntity<DegreeRequirement> getDegreeRequirement(@PathVariable long id) {
        return ResponseEntity.ok(degreeRequirementService.getById(id));
    }
    @GetMapping("/name/{name}")
    public ResponseEntity<DegreeRequirement> getDegreeRequirement(@PathVariable String name) {
        return ResponseEntity.ok(degreeRequirementService.getByName(name));
    }
    @GetMapping("/getall")
    public ResponseEntity<List<DegreeRequirement>> getAllDegreeRequirements() {
        return ResponseEntity.ok(degreeRequirementService.getAll());
    }

    // Update
    @PutMapping("/update/{id}")
    public ResponseEntity<DegreeRequirement> updateDegreeRequirement(@PathVariable long id, @RequestBody DegreeRequirementDTO dto) {
        return ResponseEntity.ok(degreeRequirementService.update(id, dto));
    }

    // Delete
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteDegreeRequirement(@PathVariable long id) {
        degreeRequirementService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

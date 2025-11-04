package com.sdmay19.courseflow.requirement_group;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/requirementgroup")
public class RequirementGroupController {

    private final RequirementGroupService requirementGroupService;

    public RequirementGroupController(RequirementGroupService requirementGroupService) {
        this.requirementGroupService = requirementGroupService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<RequirementGroup> createRequirementGroup(@RequestBody RequirementGroup requirementGroup) {
        RequirementGroup saved = requirementGroupService.create(requirementGroup);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // READ
    @GetMapping("/ident/{id}")
    public ResponseEntity<RequirementGroup> getById(@PathVariable long id) {
        return ResponseEntity.ok(requirementGroupService.getById(id));
    }
    @GetMapping("/ident/{name}")
    public ResponseEntity<RequirementGroup> getByName(@PathVariable String name) {
        return ResponseEntity.ok(requirementGroupService.getByName(name));
    }

    // UPDATE
    @PutMapping
    public ResponseEntity<RequirementGroup> updateRequirementGroup(@RequestBody RequirementGroupUpdator updates) {
        return ResponseEntity.ok(requirementGroupService.updateRequirementGroup(updates));
    }

    // DELETE
    @DeleteMapping("delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        requirementGroupService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}

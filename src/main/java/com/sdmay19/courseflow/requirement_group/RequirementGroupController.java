package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/requirementgroup")
public class RequirementGroupController {

    private final RequirementGroupService requirementGroupService;

    public RequirementGroupController(RequirementGroupService requirementGroupService) {
        this.requirementGroupService = requirementGroupService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<RequirementGroup> createRequirementGroup(@RequestBody RequirementGroupDTO dto) {
        RequirementGroup saved = requirementGroupService.createFromDTO(dto);
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
    @PutMapping("/update/{id}")
    public ResponseEntity<RequirementGroup> updateRequirementGroup(@PathVariable long id, @RequestBody RequirementGroupUpdator updates) {
        return ResponseEntity.ok(requirementGroupService.updateRequirementGroup(id, updates));
    }

    // DELETE
    @DeleteMapping("delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        requirementGroupService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}

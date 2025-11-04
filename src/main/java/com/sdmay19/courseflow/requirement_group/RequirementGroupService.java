package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupCreationException;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RequirementGroupService {

    private final RequirementGroupRepository requirementGroupRepository;

    public RequirementGroupService(RequirementGroupRepository requirementGroupRepository) {
        this.requirementGroupRepository = requirementGroupRepository;
    }

    @Transactional
    public RequirementGroup create(RequirementGroup requirementGroup) {
        validateRequirementGroup(requirementGroup);
        return requirementGroupRepository.save(requirementGroup);
    }
    public void validateRequirementGroup(RequirementGroup requirementGroup) {
        if (requirementGroup.getName().isEmpty()) {
            throw new RequirementGroupCreationException("Requirement group name cannot be empty");
        }
        if (requirementGroup.getSatisfyingCredits() == 0 || requirementGroup.getSatisfyingCredits() < 0) {
            throw new RequirementGroupCreationException("Requirement group satisfying credits is invalid");
        }
    }

    public RequirementGroup getById(long id) {
        return requirementGroupRepository.findById(id)
                .orElseThrow(() -> new RequirementGroupNotFoundException("Requirement group with id " + id + " not found"));
    }
    public RequirementGroup getByName(String name) {
        return requirementGroupRepository.findByName(name)
                .orElseThrow(() -> new RequirementGroupNotFoundException("Requirement group with name " + name + "not found"));
    }
    public List<RequirementGroup> getAll() {
        return requirementGroupRepository.findAll();
    }

    @Transactional
    public RequirementGroup updateRequirementGroup(RequirementGroupUpdator updates) {
        // USE UPDATOR HERE
        return new RequirementGroup();
    }

    @Transactional
    public void deleteById(long id) {
        requirementGroupRepository.deleteById(id);
    }
}

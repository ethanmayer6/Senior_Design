package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupCreationException;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class RequirementGroupService {

    private final RequirementGroupRepository requirementGroupRepository;
    private final CourseRepository courseRepository;

    public RequirementGroupService(RequirementGroupRepository requirementGroupRepository, CourseRepository courseRepository) {
        this.requirementGroupRepository = requirementGroupRepository;
        this.courseRepository = courseRepository;
    }

    // Create
    @Transactional
    public RequirementGroup createFromDTO(RequirementGroupDTO requirementGroupDTO) {
        // CHECK FOR REQUIREMENT GROUP ALREADY EXISTING
        List<Course> courses = getCourses(requirementGroupDTO);
        RequirementGroup saved = buildRequirementGroup(requirementGroupDTO, courses);
        validateRequirementGroup(saved);
        return requirementGroupRepository.save(saved);
    }
    public void validateRequirementGroup(RequirementGroup requirementGroup) {
        if (requirementGroup.getName().isEmpty()) {
            throw new RequirementGroupCreationException("Requirement group name cannot be empty");
        }
        if (requirementGroup.getSatisfyingCredits() == 0 || requirementGroup.getSatisfyingCredits() < 0) {
            throw new RequirementGroupCreationException("Requirement group satisfying credits is invalid");
        }
    }
    public List<Course> getCourses(RequirementGroupDTO dto) {
        List<String> courseIdents = dto.getCourseIdents();
        List<Course> courses = courseRepository.findAllByCourseIdentIn(courseIdents);

        // THROW ERROR HERE
        System.out.println("Course lookup for: " + courseIdents);
        System.out.println("Found courses: ");
        for (Course c : courses) {
            System.out.println(" - " + c.getId() + " " + c.getCourseIdent() + " " + c.getName());
        }

        return courses;
    }
    public RequirementGroup buildRequirementGroup(RequirementGroupDTO dto, List<Course> courses) {
        return new RequirementGroup(dto.getName(), dto.getSatisfyingCredits(), courses);
    }

    // Read
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

    // Update
    @Transactional
    public RequirementGroup updateRequirementGroup(long id, RequirementGroupUpdator updator) {
        RequirementGroup requirementGroup = getById(id);

        // Check for Updates
        if (updator.getName() != null) {
            requirementGroup.setName(updator.getName());
        }
        if (updator.getSatisfyingCredits() > 0) {
            requirementGroup.setSatisfyingCredits(updator.getSatisfyingCredits());
        }
        if (updator.getCourses() != null) {
            requirementGroup.setSatisfyingCredits(updator.getSatisfyingCredits());
        }

        return requirementGroupRepository.save(requirementGroup);
    }

    // Delete
    @Transactional
    public void deleteById(long id) {
        requirementGroupRepository.deleteById(id);
    }
}

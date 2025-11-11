package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupCreationException;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

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
        List<Course> courses = getCourses(requirementGroupDTO);
        RequirementGroup saved = buildFromDTO(requirementGroupDTO, courses);
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
        if (requirementGroupRepository.existsByName(requirementGroup.getName())) {
            throw new RequirementGroupCreationException("Requirement group already exists with ID " + requirementGroup.getName());
        }
    }
    public List<Course> getCourses(RequirementGroupDTO dto) {
        List<String> courseIdents = dto.getCourseIdents();
        List<Course> courses = courseRepository.findAllByCourseIdentIn(courseIdents);

        if (courses.isEmpty()) {
            throw new RequirementGroupNotFoundException("All Courses not found in requirement group " + dto.getCourseIdents());
        }

        return courses;
    }
    public RequirementGroup buildFromDTO(RequirementGroupDTO dto, List<Course> courses) {
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
    public List<RequirementGroup> getAllByName(List<String> names) {
        return requirementGroupRepository.findAllByNameIn(names);
    }
    public List<RequirementGroup> getAll() {
        return requirementGroupRepository.findAll();
    }

    // Update
    @Transactional
    public RequirementGroup updateRequirementGroup(long id, RequirementGroupDTO updater) {
        RequirementGroup requirementGroup = getById(id);
        List<Course> newCourses = getCourses(updater);

        if (updater.getName() != null) {
            requirementGroup.setName(updater.getName());
        }
        if (updater.getSatisfyingCredits() > 0) {
            requirementGroup.setSatisfyingCredits(updater.getSatisfyingCredits());
        }
        if (!newCourses.isEmpty()) {
            requirementGroup.setCourses(newCourses);
        }

        return requirementGroupRepository.save(requirementGroup);
    }

    // Delete
    @Transactional
    public void deleteById(long id) {
        requirementGroupRepository.deleteById(id);
    }
}

package com.sdmay19.courseflow.degree_requirement;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.course.CourseService;
import com.sdmay19.courseflow.exception.degreerequirement.DegreeRequirementCreationException;
import com.sdmay19.courseflow.exception.degreerequirement.DegreeRequirementNotFoundException;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.requirement_group.RequirementGroupRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class DegreeRequirementService {

    private final CourseRepository courseRepository;
    private final CourseService courseService;
    private final RequirementGroupRepository requirementGroupRepository;
    private final RequirementGroupService requirementGroupService;
    private final DegreeRequirementRepository degreeRequirementRepository;

    public DegreeRequirementService(DegreeRequirementRepository degreeRequirementRepository, CourseService courseService, CourseRepository courseRepository, RequirementGroupService requirementGroupService ,RequirementGroupRepository requirementGroupRepository) {
        this.degreeRequirementRepository = degreeRequirementRepository;
        this.courseService = courseService;
        this.courseRepository = courseRepository;
        this.requirementGroupService = requirementGroupService;
        this.requirementGroupRepository = requirementGroupRepository;
    }

    // Create
    @Transactional
    public DegreeRequirement creatFromDTO(DegreeRequirementDTO dto) {
        DegreeRequirement degreeRequirement = buildFromDTO(dto);
        validateDegreeRequirement(degreeRequirement);
        return degreeRequirementRepository.save(degreeRequirement);
    }
    public void validateDegreeRequirement(DegreeRequirement degreeRequirement) throws DegreeRequirementCreationException {
        if (degreeRequirement.getName() == null) {
            throw new DegreeRequirementCreationException("Degree requirement name cannot be null");
        }
        if (degreeRequirement.getSatisfyingCredits() < 0) {
            throw new DegreeRequirementCreationException("Degree requirement credits cannot be negative");
        }
        if (degreeRequirement.getCourses().isEmpty() && degreeRequirement.getRequirementGroups().isEmpty()) {
            throw new DegreeRequirementCreationException("Degree requirement/requirement groups cannot be empty");
        }
        if (degreeRequirementRepository.existsByName(degreeRequirement.getName())) {
            throw new DegreeRequirementCreationException("Degree requirement already exists");
        }
    }
    public DegreeRequirement buildFromDTO(DegreeRequirementDTO dto) {
        List<Course> courses = courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
        List<RequirementGroup> requirementGroups = requirementGroupRepository.findAllByNameIn(dto.getRequirementGroupNames());
        return new DegreeRequirement(dto.getName(), courses, requirementGroups, dto.getSatisfyingCredits());
    }

    // Read
    public DegreeRequirement getById(Long id) {
        return degreeRequirementRepository.findById(id)
                .orElseThrow(() -> new DegreeRequirementNotFoundException("Degree with Id " + id + " not found"));
    }
    public DegreeRequirement getByName(String name) {
        return degreeRequirementRepository.findByName(name)
                .orElseThrow(() -> new DegreeRequirementCreationException("Degree with name" + name + "not found."));
    }
    public List<DegreeRequirement> getAllByName(List<String> requirementNames) {
        return degreeRequirementRepository.findAllByNameIn(requirementNames);
    }
    public List<DegreeRequirement> getAll() {
        return degreeRequirementRepository.findAll();
    }

    // Update
    @Transactional
    public DegreeRequirement update(long id, DegreeRequirementDTO updater) {
        DegreeRequirement degreeRequirement = getById(id);

        if (updater.getName() != null) {
            degreeRequirement.setName(updater.getName());
        }
        if (updater.getCourseIdents() != null) {
            List<Course> courses = courseRepository.findAllByCourseIdentIn(updater.getCourseIdents());
            degreeRequirement.setCourses(courses);
        }
        if (updater.getRequirementGroupNames() != null) {
            List<RequirementGroup> requirementGroups = requirementGroupRepository.findAllByNameIn(updater.getRequirementGroupNames());
            degreeRequirement.setRequirementGroups(requirementGroups);
        }
        if (updater.getSatisfyingCredits() > 0) {
            degreeRequirement.setSatisfyingCredits(updater.getSatisfyingCredits());
        }

        return degreeRequirementRepository.save(degreeRequirement);
    }

    // Delete
    @Transactional
    public void deleteById(long id) { degreeRequirementRepository.deleteById(id); }
}

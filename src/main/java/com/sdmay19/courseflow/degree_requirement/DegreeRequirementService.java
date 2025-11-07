package com.sdmay19.courseflow.degree_requirement;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.requirement_group.RequirementGroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class DegreeRequirementService {

    private final CourseRepository courseRepository;
    private final RequirementGroupRepository requirementGroupRepository;
    private final DegreeRequirementRepository degreeRequirementRepository;

    public DegreeRequirementService(DegreeRequirementRepository degreeRequirementRepository, CourseRepository courseRepository, RequirementGroupRepository requirementGroupRepository) {
        this.degreeRequirementRepository = degreeRequirementRepository;
        this.courseRepository = courseRepository;
        this.requirementGroupRepository = requirementGroupRepository;
    }

    public DegreeRequirement creatFromDTO(DegreeRequirementDTO dto) {
        DegreeRequirement degreeRequirement = buildFromDTO(dto);
        return degreeRequirementRepository.save(degreeRequirement);
    }
    public DegreeRequirement buildFromDTO(DegreeRequirementDTO dto) {
        // ADD SANITY CHECKS HERE
        List<Course> courses = courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
        List<RequirementGroup> requirementGroups = requirementGroupRepository.findAllByNameIn(dto.getRequirementGroupNames());
        return new DegreeRequirement(dto.getName(), courses, requirementGroups, dto.getSatisfyingCredits());
    }
}

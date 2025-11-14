package com.sdmay19.courseflow.semester_requirement;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SemesterRequirementRepository extends JpaRepository<SemesterRequirement, Long> {
    List<SemesterRequirement> findAllByIdentIn(List<String> semesterRequirementIdents);
}

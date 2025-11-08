package com.sdmay19.courseflow.degree_requirement;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DegreeRequirementRepository extends JpaRepository<DegreeRequirement, Long> {
    Optional<DegreeRequirement> findByName(String name);
    List<DegreeRequirement> findAllByNameIn(List<String> requirementNames);

    boolean existsByName(String name);
}



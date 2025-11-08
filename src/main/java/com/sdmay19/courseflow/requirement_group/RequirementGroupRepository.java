package com.sdmay19.courseflow.requirement_group;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RequirementGroupRepository extends JpaRepository<RequirementGroup, Long> {
    Optional<RequirementGroup> findByName(String name);
    Optional<RequirementGroup> findById(long id);
    List<RequirementGroup> findAllByNameIn(List<String> requirementGroupNames);

    boolean existsByName(String name);
}

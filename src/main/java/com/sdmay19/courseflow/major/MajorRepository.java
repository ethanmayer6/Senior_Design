package com.sdmay19.courseflow.major;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MajorRepository extends JpaRepository<Major, Long> {
    Optional<Major> findByName(String majorName);
    Optional<Major> findById(Long id);
}

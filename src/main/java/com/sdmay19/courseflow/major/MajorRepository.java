package com.sdmay19.courseflow.major;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MajorRepository extends JpaRepository<Major, Long> {
    Optional<Major> findMajorByName(String majorName);
}

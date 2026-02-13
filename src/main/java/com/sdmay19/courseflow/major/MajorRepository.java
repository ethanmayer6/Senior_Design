package com.sdmay19.courseflow.major;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MajorRepository extends JpaRepository<Major, Long> {
    Optional<Major> findByName(String majorName);
    Optional<Major> findByNameIgnoreCase(String majorName);
    Optional<Major> findById(Long id);

    @Query("select m.name from Major m where m.name is not null order by m.name asc")
    List<String> findAllMajorNames();
}

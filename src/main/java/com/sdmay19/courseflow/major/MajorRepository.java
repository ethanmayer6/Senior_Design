package com.sdmay19.courseflow.major;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface MajorRepository extends JpaRepository<Major, Long> {
    Optional<Major> findByName(String majorName);
    Optional<Major> findByNameIgnoreCase(String majorName);
    Optional<Major> findByNameIgnoreCaseAndCollege(String majorName, College college);
    Optional<Major> findById(Long id);

    @Query("select m.name from Major m where m.name is not null order by m.name asc")
    List<String> findAllMajorNames();

    @Query("select new com.sdmay19.courseflow.major.MajorSummaryDTO(m.id, m.name, m.college) " +
            "from Major m where m.name is not null order by m.name asc, m.college asc")
    List<MajorSummaryDTO> findAllMajorSummaries();

    @Query("select new com.sdmay19.courseflow.major.MajorSummaryDTO(m.id, m.name, m.college) " +
            "from Major m where m.name is not null order by m.name asc, m.college asc")
    Page<MajorSummaryDTO> findMajorSummaries(Pageable pageable);

    List<Major> findAllByNameIgnoreCase(String name);
    Page<Major> findByNameContainingIgnoreCaseOrderByNameAscCollegeAsc(String name, Pageable pageable);
}

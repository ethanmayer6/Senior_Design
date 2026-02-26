package com.sdmay19.courseflow.professor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProfessorRepository extends JpaRepository<Professor, Long> {

    @Query("""
            select p
            from Professor p
            where (:query = '' or p.normalizedName like concat('%', :query, '%'))
              and (:department = '' or p.normalizedDepartment like concat('%', :department, '%'))
            order by p.normalizedName asc
            """)
    Page<Professor> searchByName(
            @Param("query") String query,
            @Param("department") String department,
            Pageable pageable);

    @Query(value = """
            select p
            from Professor p
            left join ProfessorReview r on r.professor = p
            where (:query = '' or p.normalizedName like concat('%', :query, '%'))
              and (:department = '' or p.normalizedDepartment like concat('%', :department, '%'))
            group by p
            order by coalesce(avg(r.rating), 0) desc, count(r) desc, p.normalizedName asc
            """, countQuery = """
            select count(p)
            from Professor p
            where (:query = '' or p.normalizedName like concat('%', :query, '%'))
              and (:department = '' or p.normalizedDepartment like concat('%', :department, '%'))
            """)
    Page<Professor> searchByRating(
            @Param("query") String query,
            @Param("department") String department,
            Pageable pageable);

    @Query("""
            select distinct p.department
            from Professor p
            where p.department is not null and p.department <> ''
            order by p.department asc
            """)
    List<String> findAllDepartments();

    Optional<Professor> findBySourceSystemAndExternalId(String sourceSystem, String externalId);

    Optional<Professor> findFirstByNormalizedNameAndNormalizedDepartment(String normalizedName, String normalizedDepartment);
}

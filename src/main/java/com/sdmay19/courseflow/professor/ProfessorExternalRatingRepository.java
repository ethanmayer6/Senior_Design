package com.sdmay19.courseflow.professor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProfessorExternalRatingRepository extends JpaRepository<ProfessorExternalRating, Long> {

    Optional<ProfessorExternalRating> findByProfessorAndSourceSystem(Professor professor, String sourceSystem);

    List<ProfessorExternalRating> findByProfessorIdIn(Collection<Long> professorIds);

    List<ProfessorExternalRating> findByProfessorId(long professorId);
}

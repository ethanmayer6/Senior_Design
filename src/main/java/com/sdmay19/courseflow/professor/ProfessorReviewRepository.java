package com.sdmay19.courseflow.professor;

import com.sdmay19.courseflow.User.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProfessorReviewRepository extends JpaRepository<ProfessorReview, Long> {

    Page<ProfessorReview> findByProfessorIdOrderByCreatedAtDesc(long professorId, Pageable pageable);

    Optional<ProfessorReview> findByProfessorAndReviewer(Professor professor, AppUser reviewer);

    Optional<ProfessorReview> findByProfessorIdAndReviewerId(long professorId, long reviewerId);

    boolean existsByProfessorAndReviewer(Professor professor, AppUser reviewer);

    interface RatingStatsProjection {
        Long getProfessorId();

        Double getAverageRating();

        Long getReviewCount();
    }

    interface RatingBreakdownProjection {
        Integer getRating();

        Long getReviewCount();
    }

    @Query("""
            select r.professor.id as professorId,
                   avg(r.rating) as averageRating,
                   count(r) as reviewCount
            from ProfessorReview r
            where r.professor.id in :professorIds
            group by r.professor.id
            """)
    List<RatingStatsProjection> findRatingStatsByProfessorIds(@Param("professorIds") Collection<Long> professorIds);

    @Query("""
            select r.professor.id as professorId,
                   avg(r.rating) as averageRating,
                   count(r) as reviewCount
            from ProfessorReview r
            where r.professor.id = :professorId
            group by r.professor.id
            """)
    Optional<RatingStatsProjection> findRatingStatsByProfessorId(@Param("professorId") long professorId);

    @Query("""
            select r.rating as rating,
                   count(r) as reviewCount
            from ProfessorReview r
            where r.professor.id = :professorId
            group by r.rating
            """)
    List<RatingBreakdownProjection> findRatingBreakdown(@Param("professorId") long professorId);
}

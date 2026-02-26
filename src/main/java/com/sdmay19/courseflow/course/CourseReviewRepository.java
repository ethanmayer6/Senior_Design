package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.User.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CourseReviewRepository extends JpaRepository<CourseReview, Long> {

    Page<CourseReview> findByCourseIdOrderByCreatedAtDesc(long courseId, Pageable pageable);

    Optional<CourseReview> findByCourseAndReviewer(Course course, AppUser reviewer);

    boolean existsByCourseAndReviewer(Course course, AppUser reviewer);

    interface RatingStatsProjection {
        Long getCourseId();

        Double getAverageRating();

        Long getReviewCount();
    }

    interface RatingBreakdownProjection {
        Integer getRating();

        Long getReviewCount();
    }

    @Query("""
            select r.course.id as courseId,
                   avg(r.rating) as averageRating,
                   count(r) as reviewCount
            from CourseReview r
            where r.course.id in :courseIds
            group by r.course.id
            """)
    List<RatingStatsProjection> findRatingStatsByCourseIds(@Param("courseIds") Collection<Long> courseIds);

    @Query("""
            select r.course.id as courseId,
                   avg(r.rating) as averageRating,
                   count(r) as reviewCount
            from CourseReview r
            where r.course.id = :courseId
            group by r.course.id
            """)
    Optional<RatingStatsProjection> findRatingStatsByCourseId(@Param("courseId") long courseId);

    @Query("""
            select r.rating as rating,
                   count(r) as reviewCount
            from CourseReview r
            where r.course.id = :courseId
            group by r.rating
            """)
    List<RatingBreakdownProjection> findRatingBreakdown(@Param("courseId") long courseId);
}

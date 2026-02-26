package com.sdmay19.courseflow.professor;

import java.util.Map;

public record ProfessorDetailResponse(
        long id,
        String fullName,
        String title,
        String department,
        String email,
        String profileUrl,
        String bio,
        double averageRating,
        long reviewCount,
        Map<Integer, Long> ratingBreakdown,
        ProfessorReviewResponse myReview,
        boolean currentUserCanReview) {
}

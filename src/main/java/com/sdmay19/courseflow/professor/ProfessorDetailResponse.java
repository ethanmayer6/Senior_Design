package com.sdmay19.courseflow.professor;

import java.util.List;
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
        List<ProfessorExternalRatingResponse> externalRatings,
        ProfessorReviewResponse myReview,
        boolean currentUserCanReview) {
}

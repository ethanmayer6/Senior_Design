package com.sdmay19.courseflow.course;

import java.util.Map;

public record CourseReviewSummaryResponse(
        double averageRating,
        long reviewCount,
        Map<Integer, Long> ratingBreakdown,
        CourseReviewResponse myReview,
        boolean currentUserCanReview) {
}

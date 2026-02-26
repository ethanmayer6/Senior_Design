package com.sdmay19.courseflow.course;

import java.util.List;

public record CourseReviewPageResponse(
        List<CourseReviewResponse> reviews,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}

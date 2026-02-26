package com.sdmay19.courseflow.professor;

import java.util.List;

public record ProfessorReviewPageResponse(
        List<ProfessorReviewResponse> reviews,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}

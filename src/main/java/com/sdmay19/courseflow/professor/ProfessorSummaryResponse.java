package com.sdmay19.courseflow.professor;

public record ProfessorSummaryResponse(
        long id,
        String fullName,
        String title,
        String department,
        String email,
        String profileUrl,
        double averageRating,
        long reviewCount,
        ProfessorExternalRatingResponse primaryExternalRating) {
}

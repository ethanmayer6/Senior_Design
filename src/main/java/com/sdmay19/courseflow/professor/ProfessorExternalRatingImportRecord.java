package com.sdmay19.courseflow.professor;

public record ProfessorExternalRatingImportRecord(
        Long professorId,
        String professorName,
        String department,
        String sourceSystem,
        String externalId,
        String sourceUrl,
        Double averageRating,
        Long reviewCount,
        Double difficultyRating,
        Integer wouldTakeAgainPercent,
        String capturedAt) {
}

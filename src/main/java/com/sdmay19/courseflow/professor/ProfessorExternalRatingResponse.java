package com.sdmay19.courseflow.professor;

import java.time.Instant;

public record ProfessorExternalRatingResponse(
        String sourceSystem,
        String sourceLabel,
        String externalId,
        String sourceUrl,
        Double averageRating,
        Long reviewCount,
        Double difficultyRating,
        Integer wouldTakeAgainPercent,
        Instant capturedAt,
        Instant updatedAt) {
}

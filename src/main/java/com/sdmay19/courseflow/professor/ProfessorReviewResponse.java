package com.sdmay19.courseflow.professor;

import java.time.Instant;

public record ProfessorReviewResponse(
        long id,
        int rating,
        Integer difficultyRating,
        Integer workloadRating,
        Boolean wouldTakeAgain,
        String classTaken,
        String periodTaken,
        String gradeReceived,
        String positives,
        String negatives,
        String wouldLikeToSee,
        String studyTips,
        boolean anonymous,
        Long reviewerId,
        String reviewerDisplayName,
        Instant createdAt,
        Instant updatedAt,
        boolean editableByCurrentUser) {
}

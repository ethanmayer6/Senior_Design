package com.sdmay19.courseflow.course;

import java.time.Instant;

public record CourseReviewResponse(
        long id,
        int rating,
        Integer difficultyRating,
        Integer workloadRating,
        Boolean wouldTakeAgain,
        String semesterTaken,
        String instructorName,
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

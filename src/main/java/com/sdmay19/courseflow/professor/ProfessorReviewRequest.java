package com.sdmay19.courseflow.professor;

public record ProfessorReviewRequest(
        Integer rating,
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
        Boolean anonymous) {
}

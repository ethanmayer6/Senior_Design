package com.sdmay19.courseflow.course;

public record CourseReviewRequest(
        Integer rating,
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
        Boolean anonymous) {
}

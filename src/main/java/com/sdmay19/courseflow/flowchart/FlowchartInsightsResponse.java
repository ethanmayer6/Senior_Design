package com.sdmay19.courseflow.flowchart;

import java.util.List;

public class FlowchartInsightsResponse {
    private int completedCredits;
    private int inProgressCredits;
    private int appliedCredits;
    private int totalCredits;
    private int remainingCredits;
    private int inProgressCourseCount;
    private int unfulfilledCourseCount;
    private int estimatedTermsToGraduate;
    private String projectedGraduationTerm;
    private List<String> riskFlags;

    public FlowchartInsightsResponse(
            int completedCredits,
            int inProgressCredits,
            int appliedCredits,
            int totalCredits,
            int remainingCredits,
            int inProgressCourseCount,
            int unfulfilledCourseCount,
            int estimatedTermsToGraduate,
            String projectedGraduationTerm,
            List<String> riskFlags) {
        this.completedCredits = completedCredits;
        this.inProgressCredits = inProgressCredits;
        this.appliedCredits = appliedCredits;
        this.totalCredits = totalCredits;
        this.remainingCredits = remainingCredits;
        this.inProgressCourseCount = inProgressCourseCount;
        this.unfulfilledCourseCount = unfulfilledCourseCount;
        this.estimatedTermsToGraduate = estimatedTermsToGraduate;
        this.projectedGraduationTerm = projectedGraduationTerm;
        this.riskFlags = riskFlags;
    }

    public int getCompletedCredits() {
        return completedCredits;
    }

    public int getInProgressCredits() {
        return inProgressCredits;
    }

    public int getAppliedCredits() {
        return appliedCredits;
    }

    public int getTotalCredits() {
        return totalCredits;
    }

    public int getRemainingCredits() {
        return remainingCredits;
    }

    public int getInProgressCourseCount() {
        return inProgressCourseCount;
    }

    public int getUnfulfilledCourseCount() {
        return unfulfilledCourseCount;
    }

    public int getEstimatedTermsToGraduate() {
        return estimatedTermsToGraduate;
    }

    public String getProjectedGraduationTerm() {
        return projectedGraduationTerm;
    }

    public List<String> getRiskFlags() {
        return riskFlags;
    }
}

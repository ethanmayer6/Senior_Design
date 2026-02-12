package com.sdmay19.courseflow.flowchart;

import java.util.List;

public class FlowchartRequirementCoverageResponse {
    private int totalRequirements;
    private int satisfiedRequirements;
    private int inProgressRequirements;
    private int unmetRequirements;
    private List<RequirementCoverageItem> requirements;

    public FlowchartRequirementCoverageResponse(
            int totalRequirements,
            int satisfiedRequirements,
            int inProgressRequirements,
            int unmetRequirements,
            List<RequirementCoverageItem> requirements) {
        this.totalRequirements = totalRequirements;
        this.satisfiedRequirements = satisfiedRequirements;
        this.inProgressRequirements = inProgressRequirements;
        this.unmetRequirements = unmetRequirements;
        this.requirements = requirements;
    }

    public int getTotalRequirements() {
        return totalRequirements;
    }

    public int getSatisfiedRequirements() {
        return satisfiedRequirements;
    }

    public int getInProgressRequirements() {
        return inProgressRequirements;
    }

    public int getUnmetRequirements() {
        return unmetRequirements;
    }

    public List<RequirementCoverageItem> getRequirements() {
        return requirements;
    }

    public static class RequirementCoverageItem {
        private String name;
        private int requiredCredits;
        private int completedCredits;
        private int inProgressCredits;
        private int remainingCredits;
        private String status;
        private List<String> completedCourses;
        private List<String> inProgressCourses;

        public RequirementCoverageItem(
                String name,
                int requiredCredits,
                int completedCredits,
                int inProgressCredits,
                int remainingCredits,
                String status,
                List<String> completedCourses,
                List<String> inProgressCourses) {
            this.name = name;
            this.requiredCredits = requiredCredits;
            this.completedCredits = completedCredits;
            this.inProgressCredits = inProgressCredits;
            this.remainingCredits = remainingCredits;
            this.status = status;
            this.completedCourses = completedCourses;
            this.inProgressCourses = inProgressCourses;
        }

        public String getName() {
            return name;
        }

        public int getRequiredCredits() {
            return requiredCredits;
        }

        public int getCompletedCredits() {
            return completedCredits;
        }

        public int getInProgressCredits() {
            return inProgressCredits;
        }

        public int getRemainingCredits() {
            return remainingCredits;
        }

        public String getStatus() {
            return status;
        }

        public List<String> getCompletedCourses() {
            return completedCourses;
        }

        public List<String> getInProgressCourses() {
            return inProgressCourses;
        }
    }
}

package com.sdmay19.courseflow.degree_requirement;

import java.util.List;
import java.util.Set;

public class DegreeRequirementDTO {
    private String name;
    public int satisfyingCredits;
    private List<String> courseIdents;
    private List<String> requirementGroupNames;

    public DegreeRequirementDTO() {}

    public DegreeRequirementDTO(String name, List<String> courseIdents, List<String> requirementGroupNames, int satisfyingCredits) {
        this.name = name;
        this.courseIdents = courseIdents;
        this.requirementGroupNames = requirementGroupNames;
        this.satisfyingCredits = satisfyingCredits;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getCourseIdents() {
        return courseIdents;
    }

    public void setCourseIdents(List<String> courseIdents) {
        this.courseIdents = courseIdents;
    }

    public List<String> getRequirementGroupNames() {
        return requirementGroupNames;
    }

    public void setRequirementGroupNames(List<String> requirementGroupNames) {
        this.requirementGroupNames = requirementGroupNames;
    }

    public int getSatisfyingCredits() {
        return satisfyingCredits;
    }

    public void setSatisfyingCredits(int satisfyingCredits) {
        this.satisfyingCredits = satisfyingCredits;
    }
}

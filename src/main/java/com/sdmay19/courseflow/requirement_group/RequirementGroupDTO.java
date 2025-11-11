package com.sdmay19.courseflow.requirement_group;

import java.util.List;
import java.util.Set;

public class RequirementGroupDTO {
    private String name;
    private int satisfyingCredits;
    private List<String> courseIdents;

    public RequirementGroupDTO() {}

    public RequirementGroupDTO(String name, int satisfyingCredits, List<String> courseIdents) {
        this.name = name;
        this.satisfyingCredits = satisfyingCredits;
        this.courseIdents = courseIdents;
    }

    // GETTERS
    public String getName() {
        return name;
    }
    public int getSatisfyingCredits() {
        return satisfyingCredits;
    }
    public List<String> getCourseIdents() {
        return courseIdents;
    }

    // SETTERS
    public void setName(String name) {
        this.name = name;
    }
    public void setSatisfyingCredits(int satisfyingCredits) {
        this.satisfyingCredits = satisfyingCredits;
    }
    public void setCourseIdents(List<String> courseIdents) {
        this.courseIdents = courseIdents;
    }
}

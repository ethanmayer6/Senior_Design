package com.sdmay19.courseflow.semester_requirement;

import java.util.List;

public class SemesterRequirementDTO {
    private String ident;
    private int satisfyingCredits;
    private List<String> courseIdents;

    public SemesterRequirementDTO() {}

    public SemesterRequirementDTO(String ident, int satisfyingCredits, List<String> courseIdents) {
        this.ident = ident;
        this.satisfyingCredits = satisfyingCredits;
        this.courseIdents = courseIdents;
    }

    // GETTERS
    public String getIdent() { return ident; }
    public int getSatisfyingCredits() { return satisfyingCredits; }
    public List<String> getCourseIdents() { return courseIdents; }

    // SETTERS
    public void setIdent(String ident) { this.ident = ident; }
    public void setSatisfyingCredits(int satisfyingCredits) { this.satisfyingCredits = satisfyingCredits; }
    public void setCourseIdents(List<String> courseIdents) { this.courseIdents = courseIdents; }
}

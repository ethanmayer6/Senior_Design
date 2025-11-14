package com.sdmay19.courseflow.flowchart;

import java.util.List;

public class FlowchartDTO {

    private int totalCredits;
    private int creditsSatisfied;
    private String title;
    private List<String> semesterIdents;
    private long userId;

    public FlowchartDTO () {}

    public FlowchartDTO (int totalCredits, int creditsSatisfied, String title, long userId, List<String> semesterIdents) {
        this.totalCredits = totalCredits;
        this.creditsSatisfied = creditsSatisfied;
        this.title = title;
        this.userId = userId;
        this.semesterIdents = semesterIdents;
    }

    // GETTERS
    public int getTotalCredits() { return totalCredits; }
    public int getCreditsSatisfied() { return creditsSatisfied; }
    public String getTitle() { return title; }
    public List<String> getSemesterIdents() { return semesterIdents; }
    public long getUserId() { return userId; }

    // SETTERS
    public void setTotalCredits(int totalCredits) { this.totalCredits = totalCredits; }
    public void setCreditsSatisfied(int creditsSatisfied) { this.creditsSatisfied = creditsSatisfied; }
    public void setTitle(String title) { this.title = title; }
    public void setSemesterIdents(List<String> semesterIdents) { this.semesterIdents = semesterIdents; }
    public void setUserId(long userId) { this.userId = userId; }
}

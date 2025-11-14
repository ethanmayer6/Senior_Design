package com.sdmay19.courseflow.semester;

import java.util.List;

public class SemesterDTO {

    private int year;
    private int term; // FIRST OR SECOND SEMESTER
    private String major;
    private String ident;
    private long flowchartId;
    private List<String> courseIdents;


    public SemesterDTO () {}

    public SemesterDTO (int year, int term, String major, long flowchartId, List<String> courseIdents) {
        this.year = year;
        this.term = term;
        this.major = major;
        this.flowchartId = flowchartId;
        this.courseIdents = courseIdents;
    }

    // GETTERS
    public int getYear() { return year; }
    public int getTerm() { return term; }
    public String getMajor() { return major; }
    public String getIdent() { return ident; }
    public long getFlowchartId() { return flowchartId; }
    public List<String> getCourseIdents() { return courseIdents; }

    // SETTERS
    public void setYear(int year) { this.year = year; }
    public void setTerm(int term) { this.term = term; }
    public void setMajor(String major) { this.major = major; }
    public void setIdent(String ident) { this.ident = ident; }
    public void setFlowchartId(long flowchartId) { this.flowchartId = flowchartId; }
    public void setCourseIdents(List<String> courseIdents) {}
}

package com.sdmay19.courseflow.semester;

import java.util.List;

public class SemesterDTO {


    private int year;
    private Term term; // FIRST OR SECOND SEMESTER
    private String major;
    private long flowchartId;
    private List<String> courseIdents;


    public SemesterDTO () {}

    public SemesterDTO(int year, Term term, String major, long flowchartId, List<String> courseIdents) {
        this.year = year;
        this.term = term;
        this.major = major;
        this.flowchartId = flowchartId;
        this.courseIdents = courseIdents;
    }

    // GETTERS
    public int getYear() { return year; }
    public Term getTerm() { return term; }
    public String getMajor() { return major; }
    public long getFlowchartId() { return flowchartId; }
    public List<String> getCourseIdents() { return courseIdents; }

    // SETTERS
    public void setYear(int year) { this.year = year; }
    public void setTerm(Term term) { this.term = term; }
    public void setMajor(String major) { this.major = major; }
    public void setFlowchartId(long flowchartId) { this.flowchartId = flowchartId; }
    public void setCourseIdents(List<String> courseIdents) { this.courseIdents = courseIdents; }
}

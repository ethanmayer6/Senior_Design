package com.sdmay19.courseflow.course;

import java.util.List;

public class CourseUpdater {
    private String name;
    private String ident;
    private Integer credits;
    private String prereq_txt;
    private String description;
    private String hours;
    private String offered;

    // They send prereqIds as a list and the service deals with Course entities
    private List<String> prereqIdents;

    // Getters
    public String getName() { return name; }
    public String getIdent() { return ident; }
    public Integer getCredits() { return credits; }
    public String getPrereq_txt() { return prereq_txt; }
    public String getDescription() { return description; }
    public String getHours() { return hours; }
    public String getOffered() { return offered; }
    public List<String> getPrereqIdents() { return prereqIdents; }

    // Setters
    public void setName(String name) { this.name = name; }
    public void setIdent(String ident) { this.ident = ident; }
    public void setCredits(Integer credits) { this.credits = credits; }
    public void setPrereq_txt(String prereq_txt) { this.prereq_txt = prereq_txt; }
    public void setDescription(String description) { this.description = description; }
    public void setHours(String hours) { this.hours = hours; }
    public void setOffered(String offered) { this.offered = offered; }
    public void setPrereqIds(List<String> prereqIdents) { this.prereqIdents = prereqIdents; }
}
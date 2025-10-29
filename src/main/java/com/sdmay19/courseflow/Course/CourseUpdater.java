package com.sdmay19.courseflow.course;

import java.util.List;

public class CourseUpdater {
    private String name;
    private Integer credits;
    private String prereq_txt;
    private String description;
    private String hours;
    private String offered;

    // They send prereqIds as a list and the service deals with Course entities
    private List<Long> prereqIds;

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public Integer getCredits() { return credits; }

    public void setCredits(Integer credits) { this.credits = credits; }

    public String getPrereq_txt() { return prereq_txt; }

    public void setPrereq_txt(String prereq_txt) { this.prereq_txt = prereq_txt; }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public String getHours() { return hours; }

    public void setHours(String hours) { this.hours = hours; }

    public String getOffered() { return offered; }

    public void setOffered(String offered) { this.offered = offered; }

    public List<Long> getPrereqIds() { return prereqIds; }

    public void setPrereqIds(List<Long> prereqIds) { this.prereqIds = prereqIds; }
}
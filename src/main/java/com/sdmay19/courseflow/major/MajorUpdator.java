package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;

import java.util.List;

public class MajorUpdator {
    private String name;
    private College college;
    private String description;
    private List<DegreeRequirement> degreeRequirements;

    // GETTERS
    public String getName() { return name; }
    public College getCollege() { return college; }
    public String getDescription() { return description; }
    public List<DegreeRequirement> getDegreeRequirements() { return degreeRequirements; }

    // SETTERS
    public void setName(String name) { this.name = name; }
    public void setCollege(College college) { this.college = college; }
    public void setDescription(String description) { this.description = description; }
    public void setDegreeRequirements(List<DegreeRequirement> degreeRequirements) { this.degreeRequirements = degreeRequirements; }
}

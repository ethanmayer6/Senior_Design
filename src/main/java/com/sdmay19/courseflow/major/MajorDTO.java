package com.sdmay19.courseflow.major;

import java.util.List;

public class MajorDTO {
    private String name;
    private College college;
    private String description;
    private List<String> degreeRequirements;

    public MajorDTO () {}

    public MajorDTO (String name, College college, String description, List<String> degreeRequirements) {
        this.name = name;
        this.college = college;
        this.description = description;
        this.degreeRequirements = degreeRequirements;
    }

    // GETTERS
    public String getName() { return name; }
    public College getCollege() { return college; }
    public String getDescription() { return description; }
    public List<String> getDegreeRequirements() { return degreeRequirements; }

    // SETTERS
    public void setName(String name) { this.name = name; }
    public void setCollege(College college) { this.college = college; }
    public void setDescription(String description) { this.description = description; }
    public void setDegreeRequirements(List<String> degreeRequirements) { this.degreeRequirements = degreeRequirements; }
}

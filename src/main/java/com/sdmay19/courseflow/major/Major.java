package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "major")
public class Major {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    private College college;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "major", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DegreeRequirement> degreeRequirements = new ArrayList<>();

    public Major() {}

    public Major(String name, College college, String description, List<DegreeRequirement> degreeRequirements) {
        this.name = name;
        this.college = college;
        this.description = description;
        this.degreeRequirements = degreeRequirements;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public College getCollege() {
        return college;
    }

    public void setCollege(College college) {
        this.college = college;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<DegreeRequirement> getDegreeRequirements() {
        return degreeRequirements;
    }

    public void setDegreeRequirements(List<DegreeRequirement> degreeRequirements) {
        this.degreeRequirements = degreeRequirements;
    }
}
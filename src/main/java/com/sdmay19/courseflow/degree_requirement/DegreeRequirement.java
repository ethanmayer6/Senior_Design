package com.sdmay19.courseflow.degree_requirement;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name="degree_requirement")
public class DegreeRequirement {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    private int satisfyingCredits;

    @ManyToMany
    @JoinTable(
            name = "degree_requirement_courses",
            joinColumns = @JoinColumn(name = "degree_requirement_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> courses = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "degree_requirement_groups",
            joinColumns = @JoinColumn(name = "degree_requirement_id"),
            inverseJoinColumns = @JoinColumn(name = "requirement_group_id")
    )
    private List<RequirementGroup> requirementGroups = new ArrayList<>();

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "major_id")
    private Major major;

    public DegreeRequirement() {}

    public DegreeRequirement(String name, List<Course> courses, List<RequirementGroup> requirementGroups, int satisfyingCredits) {
        this.name = name;
        this.courses = courses;
        this.requirementGroups = requirementGroups;
        this.satisfyingCredits = satisfyingCredits;
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

    public List<Course> getCourses() {
        return courses;
    }

    public void setCourses(List<Course> courses) {
        this.courses = courses;
    }

    public List<RequirementGroup> getRequirementGroups() {
        return requirementGroups;
    }

    public void setRequirementGroups(List<RequirementGroup> courseGroups) {
        this.requirementGroups = courseGroups;
    }

    public int getSatisfyingCredits() { return satisfyingCredits; }

    public void setSatisfyingCredits(int satisfyingCredits) { this.satisfyingCredits = satisfyingCredits; }
}

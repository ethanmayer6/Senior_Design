package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;

import java.util.HashSet;
import java.util.Set;

public class RequirementGroupUpdator {
    private String name;
    private int satisfyingCredits;
    private Set<Course> courses = new HashSet<>();

    // Getters
    public String getName() { return name; }
    public int getSatisfyingCredits() { return satisfyingCredits; }
    public Set<Course> getCourses() { return courses; }

    // Setters
    public void setName(String name) { this.name = name; }
    public void setSatisfyingCredits(int satisfyingCredits) { this.satisfyingCredits = satisfyingCredits; }
    public void setCourses(Set<Course> courses) { this.courses = courses; }
}

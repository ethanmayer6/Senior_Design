package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name="requirement_group")
public class RequirementGroup {

    // ADD CHECK TO NOT CREATE REDUNDANT GROUPS

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;
    private String name;
    private int satisfyingCredits;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "requirement_group_courses",
            joinColumns = @JoinColumn(name = "requirement_group_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> courses = new ArrayList<>();

    public RequirementGroup() {}

    public RequirementGroup(String name, int satisfyingCredits, List<Course> courses) {
        this.name = name;
        this.satisfyingCredits = satisfyingCredits;
        this.courses = courses;
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

    public int getSatisfyingCredits() { return this.satisfyingCredits; }

    public void setSatisfyingCredits(int satisfyingCredits) { this.satisfyingCredits = satisfyingCredits; }

    public List<Course> getCourses() {
        return courses;
    }

    public void setCourses(List<Course> courses) {
        this.courses = courses;
    }
}

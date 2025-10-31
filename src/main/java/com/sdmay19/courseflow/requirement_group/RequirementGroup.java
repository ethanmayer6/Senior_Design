package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name="requirement_group")
public class RequirementGroup {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;
    private String name;
    private int satisfyingCredits;

    @ManyToMany
    private Set<Course> courses = new HashSet<>();

    public RequirementGroup() {}

    public RequirementGroup(String name, int satisfyingCredits, Set<Course> courses) {
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

    public Set<Course> getCourses() {
        return courses;
    }

    public void setCourses(Set<Course> courses) {
        this.courses = courses;
    }
}

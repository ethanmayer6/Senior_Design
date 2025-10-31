package com.sdmay19.courseflow.degree_requirement;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name="degree_requirement")
public class DegreeRequirement {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;

    @ManyToMany
    public Set<Course> courses = new HashSet<>();

    @ManyToMany
    public Set<RequirementGroup> courseGroups = new HashSet<>();


    @ManyToOne
    @JoinColumn(name = "major_id")
    private Major major;

    public DegreeRequirement() {}

    public DegreeRequirement(String name, Set<Course> courses, Set<RequirementGroup> courseGroups) {
        this.name = name;
        this.courses = courses;
        this.courseGroups = courseGroups;
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

    public Set<RequirementGroup> getCourseGroups() {
        return courseGroups;
    }

    public void setCourseGroups(Set<RequirementGroup> courseGroups) {
        this.courseGroups = courseGroups;
    }
}

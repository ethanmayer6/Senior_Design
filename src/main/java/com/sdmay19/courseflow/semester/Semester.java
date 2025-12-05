// src/main/java/com/sdmay19/courseflow/semester/Semester.java
package com.sdmay19.courseflow.semester;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.Flowchart;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "semester")
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private int year;
    @Enumerated(EnumType.STRING)
    private Term term;
    private String major;

    @ManyToOne
    @JoinColumn(name = "flowchart_id", nullable = false)
    @JsonIgnore
    private Flowchart flowchart;

    @ManyToMany
    @JoinTable(name = "semester_courses", joinColumns = @JoinColumn(name = "semester_id"), inverseJoinColumns = @JoinColumn(name = "courses_id"))
    private List<Course> courses;

    public Semester() {
    }

    public Semester(int year, Term term, String major,
            Flowchart flowchart, List<Course> courses) {
        this.year = year;
        this.term = term;
        this.major = major;
        this.courses = courses;
        this.flowchart = flowchart;
    }

    // GETTERS
    public long getId() {
        return id;
    }

    public int getYear() {
        return year;
    }

    public Term getTerm() {
        return term;
    }

    public String getMajor() {
        return major;
    }

    public List<Course> getCourses() {
        return courses;
    }

    public Flowchart getFlowchart() {
        return flowchart;
    }

    // SETTERS
    public void setId(long id) {
        this.id = id;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public void setTerm(Term term) {
        this.term = term;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public void setCourses(List<Course> courses) {
        this.courses = courses;
    }

    public void setFlowchart(Flowchart flowchart) {
        this.flowchart = flowchart;
    }

    // HELPERS
    public void addCourse(Course course) {
        this.courses.add(course);
    }

    public void removeCourse(Course course) {
        this.courses.remove(course);
    }
}
package com.sdmay19.courseflow.semester_requirement;

import com.sdmay19.courseflow.course.Course;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name="semester_requirement")
public class SemesterRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String ident; // MATH THE COURSE IDENTITY IF A SINGLE CLASS OR NAME OF GROUP IF MULTIPLE
    private int satisfyingCredits;

    @ManyToMany
    @JoinTable(
            name = "semester_requirement_courses",
            joinColumns = @JoinColumn(name = "semester_requirement_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private List<Course> courseList;

    public SemesterRequirement() {}

    public SemesterRequirement(String ident, int satisfyingCredits, List<Course> courseList) {
        this.ident = ident;
        this.satisfyingCredits = satisfyingCredits;
        this.courseList = courseList;
    }

    // GETTERS
    public int getId() { return id; }
    public String getIdent() { return ident; }
    public int getSatisfyingCredits() { return satisfyingCredits; }
    public List<Course> getCourseList() { return courseList; }

    // SETTERS
    public void setId(int id) { this.id = id; }
    public void setIdent(String ident) { this.ident = ident; }
    public void setSatisfyingCredits(int satisfyingCredits) { this.satisfyingCredits = satisfyingCredits; }
    public void setCourseList(List<Course> courseList) { this.courseList = courseList; }
}

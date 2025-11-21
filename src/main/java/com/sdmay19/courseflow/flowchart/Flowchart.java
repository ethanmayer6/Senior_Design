// src/main/java/com/sdmay19/courseflow/flowchart/Flowchart.java
package com.sdmay19.courseflow.flowchart;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.semester.Semester;
import jakarta.persistence.*;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "flowchart")
public class Flowchart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private int totalCredits;
    private int creditsSatisfied;
    private String title;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne
    @JoinColumn(name = "major_id", nullable = false)
    private Major major;

    @OneToMany(mappedBy = "flowchart", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Semester> semesters; // <-- NO @JsonIgnore now

    @ElementCollection
    @MapKeyColumn(name = "course_ident")
    @Column(name = "status")
    private Map<String, Status> courseStatusMap;

    public Flowchart() {
    }

    public Flowchart(int totalCredits, int creditsSatisfied, String title,
            AppUser user, List<Semester> semesters,
            Map<String, Status> courseStatusMap, Major major) {
        this.totalCredits = totalCredits;
        this.creditsSatisfied = creditsSatisfied;
        this.title = title;
        this.user = user;
        this.semesters = semesters;
        this.courseStatusMap = courseStatusMap;
        this.major = major;
    }

    // GETTERS
    public long getId() {
        return id;
    }

    public int getTotalCredits() {
        return totalCredits;
    }

    public int getCreditsSatisfied() {
        return creditsSatisfied;
    }

    public String getTitle() {
        return title;
    }

    public List<Semester> getSemesters() {
        return semesters;
    }

    public AppUser getUserId() {
        return user;
    }

    public Map<String, Status> getCourseStatusMap() {
        return courseStatusMap;
    }

    public AppUser getUser() {
        return user;
    }

    public Major getMajor() {
        return major;
    }

    // SETTERS
    public void setId(long id) {
        this.id = id;
    }

    public void setTotalCredits(int totalCredits) {
        this.totalCredits = totalCredits;
    }

    public void setCreditsSatisfied(int creditsSatisfied) {
        this.creditsSatisfied = creditsSatisfied;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setSemesters(List<Semester> semesters) {
        this.semesters = semesters;
    }

    public void setCourseStatusMap(Map<String, Status> courseStatusMap) {
        this.courseStatusMap = courseStatusMap;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public void setMajor(Major major) {
        this.major = major;
    }
}
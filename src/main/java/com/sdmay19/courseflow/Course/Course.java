package com.sdmay19.courseflow.course;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "courses")
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String courseIdent;

    @Column(nullable = false)
    private int credits;

    private String prereq_txt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "course_prerequisites",
        joinColumns = @JoinColumn(name = "course_id"),
        inverseJoinColumns = @JoinColumn(name = "prereq_course_id")
    )
    private Set<Course> prerequisites = new HashSet<>();

    @Column(nullable = false)
    private String description;

    private String hours;
    private String offered;

    public Course() {}

    public Course(String name, String courseIdent, int credits, String prereq_txt, String description, String hours, String offered) {
        this.name = name;
        this.courseIdent = courseIdent;
        this.credits = credits;
        this.prereq_txt = prereq_txt;
        this.description = description;
        this.hours = hours;
        this.offered = offered;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCourseIdent() { return courseIdent; }
    public void setCourseIdent(String courseIdent) { this.courseIdent = courseIdent; }

    public int getCredits() { return credits; }
    public void setCredits(int credits) { this.credits = credits; }

    public String getPrereq_txt() { return prereq_txt; }
    public void setPrereq_txt(String prereq_txt) { this.prereq_txt = prereq_txt; }

    public Set<Course> getPrerequisites() { return prerequisites; }
    public void setPrerequisites(Set<Course> prerequisites) { this.prerequisites = prerequisites; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getHours() { return hours; }
    public void setHours(String hours) { this.hours = hours; }

    public String getOffered() { return offered; }
    public void setOffered(String offered) { this.offered = offered; }
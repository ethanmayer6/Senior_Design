package com.sdmay19.courseflow.course;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "courses")
//@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false)
    private String name;

    // Name + Number (COMS3270)
    @Column(nullable = false, unique = true)
    private String courseIdent;

    @Column(nullable = false)
    private int credits;

    @Column(columnDefinition = "TEXT")
    private String prereq_txt;

    // CHANGED THIS TO SET OF courseIdent's BECAUSE IF WE STORE WHOLE OBJECT IT WILL RETURN
    // EVERY SINGLE PREREQUISITE IN THE FRONTEND (recursively gets prerequisites)
    @ElementCollection
    @CollectionTable(name = "course_prerequisites", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "prerequisite_ident")
    private Set<String> prerequisites = new HashSet<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String hours;

    @Column(columnDefinition = "TEXT")
    private String offered;

    public Course() {}

    public Course(String name, String courseIdent, int credits, String prereq_txt, Set<String> prerequisites, String description, String hours, String offered) {
        this.name = name;
        this.courseIdent = courseIdent;
        this.credits = credits;
        this.prereq_txt = prereq_txt;
        this.prerequisites = prerequisites;
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

    public Set<String> getPrerequisites() { return prerequisites; }
    public void setPrerequisites(Set<String> prerequisites) { this.prerequisites = prerequisites; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getHours() { return hours; }
    public void setHours(String hours) { this.hours = hours; }

    public String getOffered() { return offered; }
    public void setOffered(String offered) { this.offered = offered; }
}
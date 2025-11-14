package com.sdmay19.courseflow.semester;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.major.College;
import com.sdmay19.courseflow.semester_requirement.SemesterRequirement;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name="semester")
public class Semester {

    /**
     *   TODO - KEEP THE SEMESTER OBJECT, DON'T THINK I'LL NEED THE SEMESTER REQUIREMENTS
     *   MAKE THE SEMESTER OBJECT SO JASON CAN CREATE THE FLOWCHART WITH ALL OF THE DIFFERENT SEMESTERS
     *   ALLOW FOR CLASSES AND REQUIREMENT GROUPS TO BE ADDED TO THE SEMSTER OBJECT
    **/

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private int year;
    private int term; // FIRST OR SECOND
    private String major;
    private String ident;

    @ManyToOne
    @JoinColumn(name = "flowchart_id", nullable = false)
    private Flowchart flowchart;

    @ManyToMany
    @JoinTable(
            name = "semester_courses",
            joinColumns = @JoinColumn(name = "semester_id"),
            inverseJoinColumns = @JoinColumn(name = "courses_id")
    )
    private List<Course> courses;

    public Semester() {}

    public Semester(int year, int term, String major, Flowchart flowchart, List<Course> courses) {
        this.year = year;
        this.term = term;
        this.major = major;
        this.ident = major + year + term; // TODO - DOES THIS WORK?
        this.courses = courses;
        this.flowchart = flowchart;
    }

    // GETTERS
    public long getId() { return id; }
    public int getYear() { return year; }
    public int getTerm() { return term; }
    public String getMajor() { return major; }
    public String getIdent() { return ident; }
    public List<Course> getCourses() { return courses; }
    public Flowchart getFlowchart() { return flowchart; }

    // SETTERS
    public void setId(long id) { this.id = id; }
    public void setYear(int year) { this.year = year; }
    public void setTerm(int term) { this.term = term; }
    public void setMajor(String major) { this.major = major; }
    public void setIdent(String ident) { this.ident = ident; }
    public void setCourses(List<Course> courses) { this.courses = courses; }
    public void setFlowchart(Flowchart flowchart) { this.flowchart = flowchart; }
}

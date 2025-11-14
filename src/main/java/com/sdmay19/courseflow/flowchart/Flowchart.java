package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.semester.Semester;
import jakarta.persistence.*;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "flowchart")
public class Flowchart {

    // TODO - NEED TO BE ABLE TO INFER WHAT MAJOR THE FLOWCHART IS CREATED FOR
    // TODO - NEED TO BE ABLE TO GET ALL CLASSES TAKEN TO GET PROGRESS FOR FLOWCHART
    // TODO - NEED TO BE ABLE TO GET DEGREE REQUIREMENTS FOR FLOWCHART FOR PROGRESS

    // TODO - ADD RELATIONSHIP TO MAJOR WHERE EACH FLOWCHART CAN CORRESPOND TO ONE MAJOR

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private int totalCredits;
    private int creditsSatisfied;
    private String title;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @OneToMany(mappedBy = "flowchart", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Semester> semesters;

    @ElementCollection
    @MapKeyColumn(name = "course_ident")
    @Column(name = "status")
    private Map<String, Status> courseStatusMap;

    public Flowchart() {}

    public Flowchart(int totalCredits, int creditsSatisfied, String title, AppUser user, List<Semester> semesters, Map<String, Status> courseStatusMap) {
        this.totalCredits = totalCredits;
        this.creditsSatisfied = creditsSatisfied;
        this.title = title;
        this.user = user;
        this.semesters = semesters;
        this.courseStatusMap = courseStatusMap;
    }

    // GETTERS
    public long getId() { return id; }
    public int getTotalCredits() { return totalCredits; }
    public int getCreditsSatisfied() { return creditsSatisfied; }
    public String getTitle() { return title; }
    public List<Semester> getSemesters() { return semesters; }
    public AppUser getUserId() { return user; }
    public Map<String, Status> getCourseStatusMap() { return courseStatusMap; }

    // SETTERS
    public void setId(long id) { this.id = id; }
    public void setTotalCredits(int totalCredits) { this.totalCredits = totalCredits; }
    public void setCreditsSatisfied(int creditsSatisfied) { this.creditsSatisfied = creditsSatisfied; }
    public void setTitle(String title) { this.title = title; }
    public void setSemesters(List<Semester> semesters) { this.semesters = semesters; }
    public void setUser(AppUser user) { this.user = user; }
    public void setCourseStatusMap(Map<String, Status> courseStatusMap) { this.courseStatusMap = courseStatusMap; }
}

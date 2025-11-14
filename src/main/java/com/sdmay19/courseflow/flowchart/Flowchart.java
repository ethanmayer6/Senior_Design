package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.semester.Semester;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "flowchart")
public class Flowchart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private int totalCredits;
    private int creditsSatisfied;
    private String title;

    @OneToMany(mappedBy = "flowchart", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Semester> semesters;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    public Flowchart() {}

    public Flowchart(int totalCredits, int creditsSatisfied, String title, AppUser user, List<Semester> semesters) {
        this.totalCredits = totalCredits;
        this.creditsSatisfied = creditsSatisfied;
        this.title = title;
        this.user = user;
        this.semesters = semesters;
    }

    // GETTERS
    public long getId() { return id; }
    public int getTotalCredits() { return totalCredits; }
    public int getCreditsSatisfied() { return creditsSatisfied; }
    public String getTitle() { return title; }
    public List<Semester> getSemesters() { return semesters; }
    public AppUser getUserId() { return user; }

    // SETTERS
    public void setId(long id) { this.id = id; }
    public void setTotalCredits(int totalCredits) { this.totalCredits = totalCredits; }
    public void setCreditsSatisfied(int creditsSatisfied) { this.creditsSatisfied = creditsSatisfied; }
    public void setTitle(String title) { this.title = title; }
    public void setSemesters(List<Semester> semesters) { this.semesters = semesters; }
    public void setUser(AppUser user) { this.user = user; }
}

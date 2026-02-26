package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.User.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(
        name = "course_reviews",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_course_reviews_course_reviewer",
                        columnNames = {"course_id", "reviewer_id"})
        },
        indexes = {
                @Index(name = "idx_course_reviews_course", columnList = "course_id"),
                @Index(name = "idx_course_reviews_reviewer", columnList = "reviewer_id"),
                @Index(name = "idx_course_reviews_rating", columnList = "rating")
        })
public class CourseReview {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private AppUser reviewer;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "difficulty_rating")
    private Integer difficultyRating;

    @Column(name = "workload_rating")
    private Integer workloadRating;

    @Column(name = "would_take_again")
    private Boolean wouldTakeAgain;

    @Column(name = "semester_taken", length = 120)
    private String semesterTaken;

    @Column(name = "instructor_name", length = 200)
    private String instructorName;

    @Column(name = "grade_received", length = 24)
    private String gradeReceived;

    @Column(name = "positives", columnDefinition = "TEXT")
    private String positives;

    @Column(name = "negatives", columnDefinition = "TEXT")
    private String negatives;

    @Column(name = "would_like_to_see", columnDefinition = "TEXT")
    private String wouldLikeToSee;

    @Column(name = "study_tips", columnDefinition = "TEXT")
    private String studyTips;

    @Column(name = "anonymous", nullable = false)
    private boolean anonymous;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CourseReview() {
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public AppUser getReviewer() {
        return reviewer;
    }

    public void setReviewer(AppUser reviewer) {
        this.reviewer = reviewer;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public Integer getDifficultyRating() {
        return difficultyRating;
    }

    public void setDifficultyRating(Integer difficultyRating) {
        this.difficultyRating = difficultyRating;
    }

    public Integer getWorkloadRating() {
        return workloadRating;
    }

    public void setWorkloadRating(Integer workloadRating) {
        this.workloadRating = workloadRating;
    }

    public Boolean getWouldTakeAgain() {
        return wouldTakeAgain;
    }

    public void setWouldTakeAgain(Boolean wouldTakeAgain) {
        this.wouldTakeAgain = wouldTakeAgain;
    }

    public String getSemesterTaken() {
        return semesterTaken;
    }

    public void setSemesterTaken(String semesterTaken) {
        this.semesterTaken = semesterTaken;
    }

    public String getInstructorName() {
        return instructorName;
    }

    public void setInstructorName(String instructorName) {
        this.instructorName = instructorName;
    }

    public String getGradeReceived() {
        return gradeReceived;
    }

    public void setGradeReceived(String gradeReceived) {
        this.gradeReceived = gradeReceived;
    }

    public String getPositives() {
        return positives;
    }

    public void setPositives(String positives) {
        this.positives = positives;
    }

    public String getNegatives() {
        return negatives;
    }

    public void setNegatives(String negatives) {
        this.negatives = negatives;
    }

    public String getWouldLikeToSee() {
        return wouldLikeToSee;
    }

    public void setWouldLikeToSee(String wouldLikeToSee) {
        this.wouldLikeToSee = wouldLikeToSee;
    }

    public String getStudyTips() {
        return studyTips;
    }

    public void setStudyTips(String studyTips) {
        this.studyTips = studyTips;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

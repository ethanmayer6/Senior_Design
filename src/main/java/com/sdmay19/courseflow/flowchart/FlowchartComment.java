package com.sdmay19.courseflow.flowchart;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sdmay19.courseflow.User.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "flowchart_comment")
public class FlowchartComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "flowchart_id", nullable = false)
    @JsonIgnore
    private Flowchart flowchart;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private AppUser author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "note_x")
    private Double noteX;

    @Column(name = "note_y")
    private Double noteY;

    @Column(nullable = false)
    private boolean dismissed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public FlowchartComment() {
    }

    public FlowchartComment(Flowchart flowchart, AppUser author, String body, Double noteX, Double noteY, boolean dismissed) {
        this.flowchart = flowchart;
        this.author = author;
        this.body = body;
        this.noteX = noteX;
        this.noteY = noteY;
        this.dismissed = dismissed;
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public long getId() {
        return id;
    }

    public Flowchart getFlowchart() {
        return flowchart;
    }

    public AppUser getAuthor() {
        return author;
    }

    public String getBody() {
        return body;
    }

    public Double getNoteX() {
        return noteX;
    }

    public Double getNoteY() {
        return noteY;
    }

    public boolean isDismissed() {
        return dismissed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setId(long id) {
        this.id = id;
    }

    public void setFlowchart(Flowchart flowchart) {
        this.flowchart = flowchart;
    }

    public void setAuthor(AppUser author) {
        this.author = author;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public void setNoteX(Double noteX) {
        this.noteX = noteX;
    }

    public void setNoteY(Double noteY) {
        this.noteY = noteY;
    }

    public void setDismissed(boolean dismissed) {
        this.dismissed = dismissed;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

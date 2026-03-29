package com.sdmay19.courseflow.professor;

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
import java.util.Locale;

@Entity
@Table(
        name = "professor_external_ratings",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_professor_external_ratings_professor_source",
                        columnNames = {"professor_id", "source_system"})
        },
        indexes = {
                @Index(name = "idx_professor_external_ratings_professor", columnList = "professor_id"),
                @Index(name = "idx_professor_external_ratings_source", columnList = "source_system")
        })
public class ProfessorExternalRating {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professor_id", nullable = false)
    private Professor professor;

    @Column(name = "source_system", nullable = false, length = 80)
    private String sourceSystem;

    @Column(name = "external_id", length = 220)
    private String externalId;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(name = "average_rating")
    private Double averageRating;

    @Column(name = "review_count")
    private Long reviewCount;

    @Column(name = "difficulty_rating")
    private Double difficultyRating;

    @Column(name = "would_take_again_percent")
    private Integer wouldTakeAgainPercent;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ProfessorExternalRating() {
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        normalizeFields();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        normalizeFields();
    }

    private void normalizeFields() {
        if (sourceSystem != null) {
            sourceSystem = sourceSystem.trim().toUpperCase(Locale.ROOT);
        }
        if (externalId != null) {
            externalId = externalId.trim();
            if (externalId.isBlank()) {
                externalId = null;
            }
        }
        if (sourceUrl != null) {
            sourceUrl = sourceUrl.trim();
            if (sourceUrl.isBlank()) {
                sourceUrl = null;
            }
        }
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Professor getProfessor() {
        return professor;
    }

    public void setProfessor(Professor professor) {
        this.professor = professor;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
        this.reviewCount = reviewCount;
    }

    public Double getDifficultyRating() {
        return difficultyRating;
    }

    public void setDifficultyRating(Double difficultyRating) {
        this.difficultyRating = difficultyRating;
    }

    public Integer getWouldTakeAgainPercent() {
        return wouldTakeAgainPercent;
    }

    public void setWouldTakeAgainPercent(Integer wouldTakeAgainPercent) {
        this.wouldTakeAgainPercent = wouldTakeAgainPercent;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Instant capturedAt) {
        this.capturedAt = capturedAt;
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

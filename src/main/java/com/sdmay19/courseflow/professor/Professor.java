package com.sdmay19.courseflow.professor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.Locale;

@Entity
@Table(
        name = "professors",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_professors_source_external",
                        columnNames = {"source_system", "external_id"})
        },
        indexes = {
                @Index(name = "idx_professors_normalized_name", columnList = "normalized_name"),
                @Index(name = "idx_professors_department", columnList = "normalized_department")
        })
public class Professor {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "normalized_name", nullable = false, length = 200)
    private String normalizedName;

    @Column(name = "title_line", length = 400)
    private String title;

    @Column(name = "department", length = 220)
    private String department;

    @Column(name = "normalized_department", length = 220)
    private String normalizedDepartment;

    @Column(name = "email", length = 220)
    private String email;

    @Column(name = "profile_url", length = 1000)
    private String profileUrl;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "source_system", length = 80)
    private String sourceSystem;

    @Column(name = "external_id", length = 220)
    private String externalId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Professor() {
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
        normalizedName = normalizeValue(fullName);
        normalizedDepartment = normalizeValue(department);
        if (sourceSystem != null) {
            sourceSystem = sourceSystem.trim().toUpperCase(Locale.ROOT);
        }
        if (externalId != null) {
            externalId = externalId.trim();
            if (externalId.isBlank()) {
                externalId = null;
            }
        }
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getNormalizedName() {
        return normalizedName;
    }

    public void setNormalizedName(String normalizedName) {
        this.normalizedName = normalizedName;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getNormalizedDepartment() {
        return normalizedDepartment;
    }

    public void setNormalizedDepartment(String normalizedDepartment) {
        this.normalizedDepartment = normalizedDepartment;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getProfileUrl() {
        return profileUrl;
    }

    public void setProfileUrl(String profileUrl) {
        this.profileUrl = profileUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
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

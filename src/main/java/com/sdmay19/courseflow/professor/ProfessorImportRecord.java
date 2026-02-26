package com.sdmay19.courseflow.professor;

public record ProfessorImportRecord(
        String fullName,
        String title,
        String department,
        String email,
        String profileUrl,
        String bio,
        String sourceSystem,
        String externalId) {
}

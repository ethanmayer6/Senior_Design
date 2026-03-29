package com.sdmay19.courseflow.professor;

public record ProfessorExternalRatingImportResponse(
        int imported,
        int updated,
        int skipped,
        int invalid,
        int unmatched) {
}

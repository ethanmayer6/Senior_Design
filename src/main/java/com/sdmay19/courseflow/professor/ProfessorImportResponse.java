package com.sdmay19.courseflow.professor;

public record ProfessorImportResponse(
        int imported,
        int updated,
        int skipped,
        int invalid) {
}

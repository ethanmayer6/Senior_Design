package com.sdmay19.courseflow.professor;

import java.util.List;

public record ProfessorExternalRatingImportDataset(
        String source,
        String capturedAt,
        List<ProfessorExternalRatingImportRecord> ratings) {
}

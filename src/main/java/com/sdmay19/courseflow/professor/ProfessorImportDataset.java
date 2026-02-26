package com.sdmay19.courseflow.professor;

import java.util.List;

public record ProfessorImportDataset(
        String source,
        String scrapedAt,
        List<ProfessorImportRecord> professors) {
}

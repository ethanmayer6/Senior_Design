package com.sdmay19.courseflow.professor;

import java.util.List;

public record ProfessorBrowseResponse(
        List<ProfessorSummaryResponse> professors,
        int page,
        int size,
        long totalElements,
        int totalPages,
        String sort) {
}

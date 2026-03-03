package com.sdmay19.courseflow.dining;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record DiningOverviewResponse(
        LocalDate serviceDate,
        Instant refreshedAt,
        String sourceName,
        String sourceUrl,
        List<DiningHallResponse> halls) {

    public boolean hasWarnings() {
        return halls.stream().anyMatch(hall -> hall.warningMessage() != null && !hall.warningMessage().isBlank());
    }
}

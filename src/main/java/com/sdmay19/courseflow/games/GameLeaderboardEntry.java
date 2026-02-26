package com.sdmay19.courseflow.games;

import java.time.Instant;

public record GameLeaderboardEntry(
        long userId,
        String username,
        String firstName,
        String lastName,
        long solveTimeMs,
        Instant solvedAt) {
}

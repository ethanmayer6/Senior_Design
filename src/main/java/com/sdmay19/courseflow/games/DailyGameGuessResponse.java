package com.sdmay19.courseflow.games;

public record DailyGameGuessResponse(
        boolean correct,
        String message,
        DailyGameStateResponse state) {
}

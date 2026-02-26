package com.sdmay19.courseflow.games;

import java.time.LocalDate;
import java.util.List;

public record DailyGameStateResponse(
        LocalDate puzzleDate,
        String scrambledWord,
        String clue,
        int wordLength,
        boolean solved,
        Long solveTimeMs,
        Integer rank,
        long totalSolvers,
        long startedAtEpochMs,
        int incorrectGuesses,
        List<GameLeaderboardEntry> globalLeaderboard,
        List<GameLeaderboardEntry> peerLeaderboard) {
}

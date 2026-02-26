package com.sdmay19.courseflow.games;

import com.sdmay19.courseflow.User.AppUser;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GameAttemptRepository extends JpaRepository<GameAttempt, Long> {

    Optional<GameAttempt> findByUserAndPuzzleDate(AppUser user, LocalDate puzzleDate);

    long countByPuzzleDateAndSolvedTrue(LocalDate puzzleDate);

    long countByPuzzleDateAndSolvedTrueAndSolveTimeMsLessThan(LocalDate puzzleDate, Long solveTimeMs);

    long countByPuzzleDateAndSolvedTrueAndSolveTimeMsAndSolvedAtBefore(
            LocalDate puzzleDate,
            Long solveTimeMs,
            Instant solvedAt);

    List<GameAttempt> findByPuzzleDateAndSolvedTrueOrderBySolveTimeMsAscSolvedAtAsc(
            LocalDate puzzleDate,
            Pageable pageable);

    @Query("""
            select ga
            from GameAttempt ga
            where ga.puzzleDate = :puzzleDate
              and ga.solved = true
              and ga.user.id in :userIds
            order by ga.solveTimeMs asc, ga.solvedAt asc
            """)
    List<GameAttempt> findPeerLeaderboard(
            @Param("puzzleDate") LocalDate puzzleDate,
            @Param("userIds") Collection<Long> userIds);
}

package com.sdmay19.courseflow.games;

import com.sdmay19.courseflow.User.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "game_attempts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_game_attempt_user_date",
                        columnNames = {"user_id", "puzzle_date"})
        },
        indexes = {
                @Index(
                        name = "idx_game_attempts_puzzle_solved_time",
                        columnList = "puzzle_date, solved, solve_time_ms"),
                @Index(
                        name = "idx_game_attempts_user_puzzle",
                        columnList = "user_id, puzzle_date")
        })
public class GameAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "puzzle_date", nullable = false)
    private LocalDate puzzleDate;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "solved", nullable = false)
    private boolean solved;

    @Column(name = "solved_at")
    private Instant solvedAt;

    @Column(name = "solve_time_ms")
    private Long solveTimeMs;

    @Column(name = "incorrect_guesses", nullable = false)
    private int incorrectGuesses;

    public GameAttempt() {
    }

    public GameAttempt(AppUser user, LocalDate puzzleDate, Instant startedAt) {
        this.user = user;
        this.puzzleDate = puzzleDate;
        this.startedAt = startedAt;
        this.solved = false;
        this.solvedAt = null;
        this.solveTimeMs = null;
        this.incorrectGuesses = 0;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public LocalDate getPuzzleDate() {
        return puzzleDate;
    }

    public void setPuzzleDate(LocalDate puzzleDate) {
        this.puzzleDate = puzzleDate;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public boolean isSolved() {
        return solved;
    }

    public void setSolved(boolean solved) {
        this.solved = solved;
    }

    public Instant getSolvedAt() {
        return solvedAt;
    }

    public void setSolvedAt(Instant solvedAt) {
        this.solvedAt = solvedAt;
    }

    public Long getSolveTimeMs() {
        return solveTimeMs;
    }

    public void setSolveTimeMs(Long solveTimeMs) {
        this.solveTimeMs = solveTimeMs;
    }

    public int getIncorrectGuesses() {
        return incorrectGuesses;
    }

    public void setIncorrectGuesses(int incorrectGuesses) {
        this.incorrectGuesses = incorrectGuesses;
    }
}

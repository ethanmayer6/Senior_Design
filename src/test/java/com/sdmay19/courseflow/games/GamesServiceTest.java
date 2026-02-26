package com.sdmay19.courseflow.games;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Method;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GamesServiceTest {

    @Mock
    private GameAttemptRepository gameAttemptRepository;

    @Mock
    private UserRepository userRepository;

    private Clock fixedClock;
    private GamesService gamesService;

    private AppUser principal;
    private AppUser managedUser;
    private LocalDate today;
    private Instant now;

    @BeforeEach
    void setUp() {
        now = Instant.parse("2026-02-26T15:10:30Z");
        fixedClock = Clock.fixed(now, ZoneOffset.UTC);
        gamesService = new GamesService(gameAttemptRepository, userRepository, fixedClock);

        principal = new AppUser();
        principal.setId(44L);

        managedUser = new AppUser();
        managedUser.setId(44L);
        managedUser.setEmail("student@example.edu");
        managedUser.setFirstName("Ada");
        managedUser.setLastName("Lovelace");

        today = LocalDate.now(fixedClock);
    }

    @Test
    void getDailyGame_createsAttemptWhenMissing() {
        when(userRepository.findById(44L)).thenReturn(Optional.of(managedUser));
        when(gameAttemptRepository.findByUserAndPuzzleDate(managedUser, today)).thenReturn(Optional.empty());
        when(gameAttemptRepository.save(any(GameAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameAttemptRepository.countByPuzzleDateAndSolvedTrue(today)).thenReturn(0L);
        when(gameAttemptRepository.findByPuzzleDateAndSolvedTrueOrderBySolveTimeMsAscSolvedAtAsc(eq(today), any(Pageable.class)))
                .thenReturn(List.of());
        when(gameAttemptRepository.findPeerLeaderboard(eq(today), anyCollection())).thenReturn(List.of());

        DailyGameStateResponse response = gamesService.getDailyGame(principal);

        assertThat(response.puzzleDate()).isEqualTo(today);
        assertThat(response.solved()).isFalse();
        assertThat(response.wordLength()).isGreaterThan(2);
        assertThat(response.scrambledWord()).hasSize(response.wordLength());
        assertThat(response.startedAtEpochMs()).isEqualTo(now.toEpochMilli());
        assertThat(response.totalSolvers()).isZero();
    }

    @Test
    void submitDailyGuess_correctGuessMarksSolvedAndCapturesTime() throws Exception {
        String answer = answerForDate(today);
        Instant startedAt = now.minusSeconds(75);
        GameAttempt existing = new GameAttempt(managedUser, today, startedAt);

        when(userRepository.findById(44L)).thenReturn(Optional.of(managedUser));
        when(gameAttemptRepository.findByUserAndPuzzleDate(managedUser, today)).thenReturn(Optional.of(existing));
        when(gameAttemptRepository.save(any(GameAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameAttemptRepository.countByPuzzleDateAndSolvedTrue(today)).thenReturn(1L);
        when(gameAttemptRepository.countByPuzzleDateAndSolvedTrueAndSolveTimeMsLessThan(eq(today), anyLong()))
                .thenReturn(0L);
        when(gameAttemptRepository.countByPuzzleDateAndSolvedTrueAndSolveTimeMsAndSolvedAtBefore(eq(today), anyLong(), any(Instant.class)))
                .thenReturn(0L);
        when(gameAttemptRepository.findByPuzzleDateAndSolvedTrueOrderBySolveTimeMsAscSolvedAtAsc(eq(today), any(Pageable.class)))
                .thenReturn(List.of(existing));
        when(gameAttemptRepository.findPeerLeaderboard(eq(today), anyCollection()))
                .thenReturn(List.of(existing));

        DailyGameGuessResponse response = gamesService.submitDailyGuess(principal, new DailyGameGuessRequest(answer));

        assertThat(response.correct()).isTrue();
        assertThat(response.state().solved()).isTrue();
        assertThat(response.state().solveTimeMs()).isNotNull();
        assertThat(response.state().solveTimeMs()).isEqualTo(75_000L);
        assertThat(response.state().rank()).isEqualTo(1);
        assertThat(response.state().totalSolvers()).isEqualTo(1L);

        ArgumentCaptor<GameAttempt> savedAttemptCaptor = ArgumentCaptor.forClass(GameAttempt.class);
        verify(gameAttemptRepository).save(savedAttemptCaptor.capture());
        GameAttempt saved = savedAttemptCaptor.getValue();
        assertThat(saved.isSolved()).isTrue();
        assertThat(saved.getSolveTimeMs()).isEqualTo(75_000L);
        assertThat(saved.getSolvedAt()).isEqualTo(now);
    }

    @Test
    void submitDailyGuess_wrongGuessIncrementsMissCount() {
        GameAttempt existing = new GameAttempt(managedUser, today, now.minusSeconds(30));

        when(userRepository.findById(44L)).thenReturn(Optional.of(managedUser));
        when(gameAttemptRepository.findByUserAndPuzzleDate(managedUser, today)).thenReturn(Optional.of(existing));
        when(gameAttemptRepository.save(any(GameAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameAttemptRepository.countByPuzzleDateAndSolvedTrue(today)).thenReturn(0L);
        when(gameAttemptRepository.findByPuzzleDateAndSolvedTrueOrderBySolveTimeMsAscSolvedAtAsc(eq(today), any(Pageable.class)))
                .thenReturn(List.of());
        when(gameAttemptRepository.findPeerLeaderboard(eq(today), anyCollection()))
                .thenReturn(List.of());

        DailyGameGuessResponse response = gamesService.submitDailyGuess(principal, new DailyGameGuessRequest("wrong"));

        assertThat(response.correct()).isFalse();
        assertThat(response.state().solved()).isFalse();
        assertThat(response.state().incorrectGuesses()).isEqualTo(1);
    }

    private String answerForDate(LocalDate date) throws Exception {
        Method resolvePuzzle = GamesService.class.getDeclaredMethod("resolvePuzzle", LocalDate.class);
        resolvePuzzle.setAccessible(true);
        Object puzzle = resolvePuzzle.invoke(gamesService, date);
        Method answer = puzzle.getClass().getDeclaredMethod("answer");
        answer.setAccessible(true);
        return (String) answer.invoke(puzzle);
    }
}

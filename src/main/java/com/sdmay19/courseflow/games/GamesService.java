package com.sdmay19.courseflow.games;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@Transactional
public class GamesService {

    private static final int GLOBAL_LEADERBOARD_SIZE = 10;
    private static final int PEER_LEADERBOARD_SIZE = 10;
    private static final long MIN_SOLVE_TIME_MS = 1_000L;
    private static final Pattern NON_ALPHA_PATTERN = Pattern.compile("[^A-Z]");

    private final GameAttemptRepository gameAttemptRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    private record DailyWord(String answer, String clue) {
    }

    private record DailyPuzzle(String answer, String clue, String scrambledWord) {
    }

    private static final List<DailyWord> WORD_BANK = List.of(
            new DailyWord("PUZZLE", "A brain teaser you solve for fun."),
            new DailyWord("CAMPUS", "The grounds where classes happen."),
            new DailyWord("SYLLABUS", "Course guide with policies and deadlines."),
            new DailyWord("LECTURE", "Instructor-led class session."),
            new DailyWord("PROJECT", "Multi-step graded assignment."),
            new DailyWord("MIDTERM", "Exam typically taken around week eight."),
            new DailyWord("FINALS", "Exams at the end of a semester."),
            new DailyWord("CREDITS", "Units used to measure course completion."),
            new DailyWord("LIBRARY", "Place to study and borrow books."),
            new DailyWord("SEMESTER", "One half of an academic year."),
            new DailyWord("FLOWCHART", "Visual plan of semester-by-semester courses."),
            new DailyWord("SCHEDULE", "Plan showing times and events."),
            new DailyWord("ADVISOR", "Person who helps with academic planning."),
            new DailyWord("MAJORS", "Primary field(s) of study."),
            new DailyWord("MINORS", "Secondary field(s) of study."),
            new DailyWord("CAPSTONE", "Culminating experience before graduation."),
            new DailyWord("DIPLOMA", "Credential awarded at graduation."),
            new DailyWord("GRADUATE", "Complete a degree program."),
            new DailyWord("RESEARCH", "Systematic investigation for new knowledge."),
            new DailyWord("BIOLOGY", "Study of living organisms."),
            new DailyWord("PHYSICS", "Study of matter, energy, and motion."),
            new DailyWord("ALGEBRA", "Math branch focused on symbols."),
            new DailyWord("NETWORK", "Connected systems that share data."),
            new DailyWord("ROUTING", "Directing traffic from source to destination."),
            new DailyWord("BACKEND", "Server-side application layer."),
            new DailyWord("FRONTEND", "User-facing application layer."),
            new DailyWord("MODULE", "Self-contained unit of functionality."),
            new DailyWord("KERNEL", "Core layer of an operating system."),
            new DailyWord("DATASET", "Structured collection of information."),
            new DailyWord("JAVA", "Language this backend is using today."),
            new DailyWord("REACT", "Frontend library used in this project."));

    @Autowired
    public GamesService(GameAttemptRepository gameAttemptRepository, UserRepository userRepository) {
        this(gameAttemptRepository, userRepository, Clock.systemUTC());
    }

    GamesService(GameAttemptRepository gameAttemptRepository, UserRepository userRepository, Clock clock) {
        this.gameAttemptRepository = gameAttemptRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    public DailyGameStateResponse getDailyGame(AppUser principal) {
        AppUser user = loadManagedUser(principal);
        LocalDate puzzleDate = LocalDate.now(clock);
        DailyPuzzle puzzle = resolvePuzzle(puzzleDate);
        GameAttempt attempt = getOrCreateAttempt(user, puzzleDate);
        return buildState(user, attempt, puzzle);
    }

    public DailyGameGuessResponse submitDailyGuess(AppUser principal, DailyGameGuessRequest request) {
        if (request == null || request.guess() == null || request.guess().isBlank()) {
            throw new IllegalArgumentException("Guess is required.");
        }

        AppUser user = loadManagedUser(principal);
        LocalDate puzzleDate = LocalDate.now(clock);
        DailyPuzzle puzzle = resolvePuzzle(puzzleDate);
        GameAttempt attempt = getOrCreateAttempt(user, puzzleDate);

        if (attempt.isSolved()) {
            return new DailyGameGuessResponse(
                    true,
                    "You already solved today's puzzle.",
                    buildState(user, attempt, puzzle));
        }

        String normalizedGuess = normalizeGuess(request.guess());
        if (normalizedGuess.isBlank()) {
            throw new IllegalArgumentException("Guess must include at least one letter.");
        }

        if (!normalizedGuess.equals(puzzle.answer())) {
            attempt.setIncorrectGuesses(attempt.getIncorrectGuesses() + 1);
            gameAttemptRepository.save(attempt);
            return new DailyGameGuessResponse(
                    false,
                    "Not quite. Try again.",
                    buildState(user, attempt, puzzle));
        }

        Instant now = Instant.now(clock);
        long elapsedMs = Math.max(MIN_SOLVE_TIME_MS, Duration.between(attempt.getStartedAt(), now).toMillis());
        attempt.setSolved(true);
        attempt.setSolvedAt(now);
        attempt.setSolveTimeMs(elapsedMs);
        gameAttemptRepository.save(attempt);

        return new DailyGameGuessResponse(
                true,
                "Correct! Great solve.",
                buildState(user, attempt, puzzle));
    }

    private AppUser loadManagedUser(AppUser principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Authenticated user is required.");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found: " + principal.getId()));
    }

    private GameAttempt getOrCreateAttempt(AppUser user, LocalDate puzzleDate) {
        return gameAttemptRepository.findByUserAndPuzzleDate(user, puzzleDate)
                .map(existing -> {
                    if (existing.getStartedAt() == null) {
                        existing.setStartedAt(Instant.now(clock));
                        return gameAttemptRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> gameAttemptRepository.save(
                        new GameAttempt(user, puzzleDate, Instant.now(clock))));
    }

    private DailyGameStateResponse buildState(AppUser user, GameAttempt attempt, DailyPuzzle puzzle) {
        LocalDate puzzleDate = attempt.getPuzzleDate();
        long totalSolvers = gameAttemptRepository.countByPuzzleDateAndSolvedTrue(puzzleDate);
        Integer rank = calculateRankIfSolved(attempt);

        List<GameLeaderboardEntry> globalLeaderboard = gameAttemptRepository
                .findByPuzzleDateAndSolvedTrueOrderBySolveTimeMsAscSolvedAtAsc(
                        puzzleDate,
                        PageRequest.of(0, GLOBAL_LEADERBOARD_SIZE))
                .stream()
                .map(this::toLeaderboardEntry)
                .toList();

        List<GameLeaderboardEntry> peerLeaderboard = buildPeerLeaderboard(user, puzzleDate);
        long startedAtEpochMs = attempt.getStartedAt() == null ? 0L : attempt.getStartedAt().toEpochMilli();

        return new DailyGameStateResponse(
                puzzleDate,
                puzzle.scrambledWord(),
                puzzle.clue(),
                puzzle.answer().length(),
                attempt.isSolved(),
                attempt.getSolveTimeMs(),
                rank,
                totalSolvers,
                startedAtEpochMs,
                attempt.getIncorrectGuesses(),
                globalLeaderboard,
                peerLeaderboard);
    }

    private List<GameLeaderboardEntry> buildPeerLeaderboard(AppUser user, LocalDate puzzleDate) {
        Set<Long> peerIds = new LinkedHashSet<>();
        peerIds.add(user.getId());
        if (user.getFriends() != null) {
            user.getFriends().stream()
                    .map(AppUser::getId)
                    .forEach(peerIds::add);
        }

        if (peerIds.isEmpty()) {
            return List.of();
        }

        return gameAttemptRepository.findPeerLeaderboard(puzzleDate, peerIds).stream()
                .limit(PEER_LEADERBOARD_SIZE)
                .map(this::toLeaderboardEntry)
                .toList();
    }

    private GameLeaderboardEntry toLeaderboardEntry(GameAttempt attempt) {
        AppUser solver = attempt.getUser();
        return new GameLeaderboardEntry(
                solver.getId(),
                solver.getUsername(),
                solver.getFirstName(),
                solver.getLastName(),
                attempt.getSolveTimeMs() == null ? 0L : attempt.getSolveTimeMs(),
                attempt.getSolvedAt());
    }

    private Integer calculateRankIfSolved(GameAttempt attempt) {
        if (!attempt.isSolved() || attempt.getSolveTimeMs() == null || attempt.getSolvedAt() == null) {
            return null;
        }

        long fasterCount = gameAttemptRepository.countByPuzzleDateAndSolvedTrueAndSolveTimeMsLessThan(
                attempt.getPuzzleDate(),
                attempt.getSolveTimeMs());
        long sameTimeEarlierCount = gameAttemptRepository.countByPuzzleDateAndSolvedTrueAndSolveTimeMsAndSolvedAtBefore(
                attempt.getPuzzleDate(),
                attempt.getSolveTimeMs(),
                attempt.getSolvedAt());

        long rank = fasterCount + sameTimeEarlierCount + 1L;
        return rank > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) rank;
    }

    private DailyPuzzle resolvePuzzle(LocalDate puzzleDate) {
        int idx = (int) Math.floorMod((puzzleDate.toEpochDay() * 53L) + 17L, WORD_BANK.size());
        DailyWord dailyWord = WORD_BANK.get(idx);
        String scrambledWord = scrambleWord(dailyWord.answer(), puzzleDate);
        return new DailyPuzzle(dailyWord.answer(), dailyWord.clue(), scrambledWord);
    }

    private String scrambleWord(String answer, LocalDate puzzleDate) {
        if (answer.length() < 2) {
            return answer;
        }

        long baseSeed = (puzzleDate.toEpochDay() * 7_919L) + (answer.length() * 97L);
        for (int attempt = 0; attempt < 8; attempt++) {
            char[] letters = answer.toCharArray();
            Random random = new Random(baseSeed + (attempt * 131L));
            for (int i = letters.length - 1; i > 0; i--) {
                int j = random.nextInt(i + 1);
                char temp = letters[i];
                letters[i] = letters[j];
                letters[j] = temp;
            }
            String scrambled = new String(letters);
            if (!scrambled.equals(answer)) {
                return scrambled;
            }
        }
        return answer.substring(1) + answer.charAt(0);
    }

    private String normalizeGuess(String guess) {
        return NON_ALPHA_PATTERN.matcher(guess.trim().toUpperCase(Locale.ROOT)).replaceAll("");
    }
}

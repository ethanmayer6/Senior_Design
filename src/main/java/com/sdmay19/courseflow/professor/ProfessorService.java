package com.sdmay19.courseflow.professor;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class ProfessorService {

    private static final int DEFAULT_PAGE_SIZE = 25;
    private static final int MAX_PAGE_SIZE = 100;
    private static final String RATE_MY_PROFESSORS = "RATE_MY_PROFESSORS";
    private static final Pattern RATE_MY_PROFESSORS_ID_PATTERN = Pattern.compile("/professor/(\\d+)");

    private record RatingStats(double average, long count) {
    }

    private final ProfessorRepository professorRepository;
    private final ProfessorExternalRatingRepository professorExternalRatingRepository;
    private final ProfessorReviewRepository professorReviewRepository;
    private final UserRepository userRepository;
    private final ProfessorDirectoryState professorDirectoryState;

    public ProfessorService(
            ProfessorRepository professorRepository,
            ProfessorExternalRatingRepository professorExternalRatingRepository,
            ProfessorReviewRepository professorReviewRepository,
            UserRepository userRepository,
            ProfessorDirectoryState professorDirectoryState) {
        this.professorRepository = professorRepository;
        this.professorExternalRatingRepository = professorExternalRatingRepository;
        this.professorReviewRepository = professorReviewRepository;
        this.userRepository = userRepository;
        this.professorDirectoryState = professorDirectoryState;
    }

    @Transactional(readOnly = true)
    public ProfessorBrowseResponse browseProfessors(
            String query,
            String department,
            Integer page,
            Integer size,
            String sort) {
        int safePage = Math.max(0, page == null ? 0 : page);
        int safeSize = sanitizePageSize(size);
        String normalizedQuery = normalizeSearchToken(query);
        String normalizedDepartment = normalizeSearchToken(department);
        String normalizedSort = normalizeSort(sort);

        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<Professor> result = "rating".equals(normalizedSort)
                ? professorRepository.searchByRating(normalizedQuery, normalizedDepartment, pageable)
                : professorRepository.searchByName(normalizedQuery, normalizedDepartment, pageable);

        List<Long> professorIds = result.getContent().stream()
                .map(Professor::getId)
                .toList();
        Map<Long, RatingStats> statsByProfessorId = buildStatsMap(professorIds);
        Map<Long, ProfessorExternalRatingResponse> primaryExternalRatings = buildPrimaryExternalRatingsMap(professorIds);

        List<ProfessorSummaryResponse> summaries = result.getContent().stream()
                .map(professor -> {
                    RatingStats stats = statsByProfessorId.getOrDefault(professor.getId(), new RatingStats(0.0, 0L));
                    return new ProfessorSummaryResponse(
                            professor.getId(),
                            professor.getFullName(),
                            professor.getTitle(),
                            professor.getDepartment(),
                            professor.getEmail(),
                            professor.getProfileUrl(),
                            stats.average(),
                            stats.count(),
                            primaryExternalRatings.get(professor.getId()));
                })
                .toList();

        return new ProfessorBrowseResponse(
                summaries,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                normalizedSort);
    }

    @Transactional(readOnly = true)
    public List<String> getAllDepartments() {
        return professorRepository.findAllDepartments();
    }

    @Transactional(readOnly = true)
    public ProfessorDirectoryStatusResponse getDirectoryStatus() {
        long professorCount = professorRepository.count();
        boolean seeding = professorDirectoryState.isSeeding();
        return new ProfessorDirectoryStatusResponse(!seeding && professorCount > 0, seeding, professorCount);
    }

    @Transactional(readOnly = true)
    public ProfessorDetailResponse getProfessorDetail(long professorId, AppUser principal) {
        Professor professor = getProfessorOrThrow(professorId);
        AppUser viewer = principal == null ? null : loadManagedUser(principal);
        List<ProfessorExternalRatingResponse> externalRatings = getExternalRatingsForProfessor(professorId);

        RatingStats stats = professorReviewRepository.findRatingStatsByProfessorId(professorId)
                .map(view -> new RatingStats(
                        view.getAverageRating() == null ? 0.0 : view.getAverageRating(),
                        view.getReviewCount() == null ? 0L : view.getReviewCount()))
                .orElse(new RatingStats(0.0, 0L));

        Map<Integer, Long> ratingBreakdown = initRatingBreakdown();
        for (ProfessorReviewRepository.RatingBreakdownProjection projection : professorReviewRepository.findRatingBreakdown(professorId)) {
            if (projection.getRating() == null || projection.getReviewCount() == null) {
                continue;
            }
            ratingBreakdown.put(projection.getRating(), projection.getReviewCount());
        }

        ProfessorReviewResponse myReview = null;
        if (viewer != null) {
            myReview = professorReviewRepository.findByProfessorAndReviewer(professor, viewer)
                    .map(review -> toReviewResponse(review, viewer))
                    .orElse(null);
        }

        return new ProfessorDetailResponse(
                professor.getId(),
                professor.getFullName(),
                professor.getTitle(),
                professor.getDepartment(),
                professor.getEmail(),
                professor.getProfileUrl(),
                professor.getBio(),
                stats.average(),
                stats.count(),
                ratingBreakdown,
                externalRatings,
                myReview,
                viewer != null && isStudentRole(viewer.getRole()));
    }

    @Transactional(readOnly = true)
    public ProfessorReviewPageResponse getProfessorReviews(
            long professorId,
            AppUser principal,
            Integer page,
            Integer size) {
        getProfessorOrThrow(professorId);
        AppUser viewer = principal == null ? null : loadManagedUser(principal);

        int safePage = Math.max(0, page == null ? 0 : page);
        int safeSize = sanitizePageSize(size);
        Page<ProfessorReview> reviews = professorReviewRepository.findByProfessorIdOrderByCreatedAtDesc(
                professorId,
                PageRequest.of(safePage, safeSize));

        List<ProfessorReviewResponse> mapped = reviews.getContent().stream()
                .map(review -> toReviewResponse(review, viewer))
                .toList();

        return new ProfessorReviewPageResponse(
                mapped,
                reviews.getNumber(),
                reviews.getSize(),
                reviews.getTotalElements(),
                reviews.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ProfessorReviewResponse getMyProfessorReview(long professorId, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Professor professor = getProfessorOrThrow(professorId);
        return professorReviewRepository.findByProfessorAndReviewer(professor, reviewer)
                .map(review -> toReviewResponse(review, reviewer))
                .orElse(null);
    }

    public ProfessorReviewResponse createProfessorReview(long professorId, ProfessorReviewRequest request, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Professor professor = getProfessorOrThrow(professorId);

        if (professorReviewRepository.existsByProfessorAndReviewer(professor, reviewer)) {
            throw new IllegalArgumentException("You have already reviewed this professor. Edit your existing review instead.");
        }

        ProfessorReview review = new ProfessorReview();
        review.setProfessor(professor);
        review.setReviewer(reviewer);
        applyReviewRequest(review, request, true);

        ProfessorReview saved = professorReviewRepository.save(review);
        return toReviewResponse(saved, reviewer);
    }

    public ProfessorReviewResponse updateMyProfessorReview(long professorId, ProfessorReviewRequest request, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Professor professor = getProfessorOrThrow(professorId);

        ProfessorReview review = professorReviewRepository.findByProfessorAndReviewer(professor, reviewer)
                .orElseThrow(() -> new IllegalArgumentException("No review found to update for this professor."));

        applyReviewRequest(review, request, false);
        ProfessorReview saved = professorReviewRepository.save(review);
        return toReviewResponse(saved, reviewer);
    }

    public void deleteMyProfessorReview(long professorId, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Professor professor = getProfessorOrThrow(professorId);
        ProfessorReview review = professorReviewRepository.findByProfessorAndReviewer(professor, reviewer)
                .orElseThrow(() -> new IllegalArgumentException("No review found to delete for this professor."));
        professorReviewRepository.delete(review);
    }

    public ProfessorImportResponse importFromDataset(ProfessorImportDataset dataset, boolean overwriteExisting) {
        if (dataset == null || dataset.professors() == null) {
            throw new IllegalArgumentException("Import payload must include a professors array.");
        }

        int imported = 0;
        int updated = 0;
        int skipped = 0;
        int invalid = 0;

        Set<String> seenKeys = new LinkedHashSet<>();
        for (ProfessorImportRecord row : dataset.professors()) {
            if (row == null || row.fullName() == null || row.fullName().isBlank()) {
                invalid += 1;
                continue;
            }

            String sourceSystem = normalizeSource(row.sourceSystem(), dataset.source());
            String externalId = trimToNull(row.externalId());
            String fullName = normalizeDisplayText(row.fullName(), 200);
            String department = normalizeDepartment(row.department(), row.title());

            String dedupeKey = (sourceSystem == null ? "" : sourceSystem) + "::"
                    + (externalId == null ? "" : externalId) + "::"
                    + normalizeLookupToken(fullName) + "::"
                    + normalizeLookupToken(department);
            if (!seenKeys.add(dedupeKey)) {
                skipped += 1;
                continue;
            }

            Optional<Professor> existing = Optional.empty();
            if (sourceSystem != null && externalId != null) {
                existing = professorRepository.findBySourceSystemAndExternalId(sourceSystem, externalId);
            }
            if (existing.isEmpty()) {
                existing = professorRepository.findFirstByNormalizedNameAndNormalizedDepartment(
                        normalizeLookupToken(fullName),
                        normalizeLookupToken(department));
            }

            if (existing.isPresent() && !overwriteExisting) {
                skipped += 1;
                continue;
            }

            Professor professor = existing.orElseGet(Professor::new);
            professor.setFullName(fullName);
            professor.setTitle(normalizeDisplayText(row.title(), 400));
            professor.setDepartment(department);
            professor.setEmail(normalizeDisplayText(row.email(), 220));
            professor.setProfileUrl(normalizeDisplayText(row.profileUrl(), 1000));
            professor.setBio(normalizeDisplayText(row.bio(), 10000));
            professor.setSourceSystem(sourceSystem);
            professor.setExternalId(externalId);
            professorRepository.save(professor);

            if (existing.isPresent()) {
                updated += 1;
            } else {
                imported += 1;
            }
        }

        return new ProfessorImportResponse(imported, updated, skipped, invalid);
    }

    public int normalizeExistingProfessorDirectory() {
        int updated = 0;
        List<Professor> professors = professorRepository.findAll();
        for (Professor professor : professors) {
            String normalizedDepartment = normalizeDepartment(professor.getDepartment(), professor.getTitle());
            if (Objects.equals(professor.getDepartment(), normalizedDepartment)) {
                continue;
            }
            professor.setDepartment(normalizedDepartment);
            updated += 1;
        }
        return updated;
    }

    public ProfessorImportResponse importFromJsonFile(MultipartFile file, boolean overwriteExisting) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A non-empty JSON file is required.");
        }
        try {
            String content = new String(file.getBytes());
            ProfessorImportDataset dataset = ProfessorImportParsers.parseDataset(content);
            return importFromDataset(dataset, overwriteExisting);
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read import file: " + e.getMessage());
        }
    }

    public ProfessorExternalRatingImportResponse importExternalRatingsFromDataset(
            ProfessorExternalRatingImportDataset dataset,
            boolean overwriteExisting) {
        if (dataset == null || dataset.ratings() == null) {
            throw new IllegalArgumentException("Import payload must include a ratings array.");
        }

        int imported = 0;
        int updated = 0;
        int skipped = 0;
        int invalid = 0;
        int unmatched = 0;

        Set<String> seenKeys = new LinkedHashSet<>();
        Instant datasetCapturedAt = parseInstant(dataset.capturedAt());
        for (ProfessorExternalRatingImportRecord row : dataset.ratings()) {
            if (row == null) {
                invalid += 1;
                continue;
            }

            String sourceSystem = normalizeSource(row.sourceSystem(), dataset.source());
            if (sourceSystem == null) {
                invalid += 1;
                continue;
            }

            Professor professor = resolveProfessorForExternalRating(row);
            if (professor == null) {
                unmatched += 1;
                continue;
            }

            Double averageRating = row.averageRating();
            Long reviewCount = row.reviewCount();
            String sourceUrl = normalizeDisplayText(row.sourceUrl(), 1000);
            if (!hasValidExternalStats(averageRating, reviewCount)
                    || !isValidExternalDifficulty(row.difficultyRating())
                    || !isValidWouldTakeAgainPercent(row.wouldTakeAgainPercent())
                    || (!hasExternalStats(averageRating, reviewCount) && sourceUrl == null)) {
                invalid += 1;
                continue;
            }

            String dedupeKey = professor.getId() + "::" + sourceSystem;
            if (!seenKeys.add(dedupeKey)) {
                skipped += 1;
                continue;
            }

            Optional<ProfessorExternalRating> existing =
                    professorExternalRatingRepository.findByProfessorAndSourceSystem(professor, sourceSystem);
            if (existing.isPresent() && !overwriteExisting) {
                skipped += 1;
                continue;
            }

            ProfessorExternalRating rating = existing.orElseGet(ProfessorExternalRating::new);
            rating.setProfessor(professor);
            rating.setSourceSystem(sourceSystem);
            rating.setExternalId(normalizeDisplayText(row.externalId(), 220));
            rating.setSourceUrl(sourceUrl);
            rating.setAverageRating(averageRating);
            rating.setReviewCount(reviewCount);
            rating.setDifficultyRating(row.difficultyRating());
            rating.setWouldTakeAgainPercent(row.wouldTakeAgainPercent());
            rating.setCapturedAt(firstNonNull(parseInstant(row.capturedAt()), datasetCapturedAt, Instant.now()));
            professorExternalRatingRepository.save(rating);

            if (existing.isPresent()) {
                updated += 1;
            } else {
                imported += 1;
            }
        }

        return new ProfessorExternalRatingImportResponse(imported, updated, skipped, invalid, unmatched);
    }

    public ProfessorExternalRatingImportResponse importExternalRatingsFromJsonFile(
            MultipartFile file,
            boolean overwriteExisting) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A non-empty JSON file is required.");
        }
        try {
            String content = new String(file.getBytes());
            ProfessorExternalRatingImportDataset dataset =
                    ProfessorExternalRatingImportParsers.parseDataset(content);
            return importExternalRatingsFromDataset(dataset, overwriteExisting);
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read import file: " + e.getMessage());
        }
    }

    public ProfessorExternalRatingResponse upsertRateMyProfessorsLink(long professorId, String sourceUrl) {
        Professor professor = getProfessorOrThrow(professorId);
        String normalizedSourceUrl = normalizeRateMyProfessorsUrl(sourceUrl);

        ProfessorExternalRating rating = professorExternalRatingRepository
                .findByProfessorAndSourceSystem(professor, RATE_MY_PROFESSORS)
                .orElseGet(ProfessorExternalRating::new);

        rating.setProfessor(professor);
        rating.setSourceSystem(RATE_MY_PROFESSORS);
        rating.setSourceUrl(normalizedSourceUrl);

        String extractedExternalId = extractRateMyProfessorsExternalId(normalizedSourceUrl);
        if (extractedExternalId != null) {
            rating.setExternalId(extractedExternalId);
        }
        if (rating.getCapturedAt() == null) {
            rating.setCapturedAt(Instant.now());
        }

        ProfessorExternalRating saved = professorExternalRatingRepository.save(rating);
        return toExternalRatingResponse(saved);
    }

    private Professor getProfessorOrThrow(long professorId) {
        return professorRepository.findById(professorId)
                .orElseThrow(() -> new IllegalArgumentException("Professor not found: " + professorId));
    }

    private AppUser loadManagedUser(AppUser principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found: " + principal.getId()));
    }

    private AppUser requireStudentPrincipal(AppUser principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Authentication is required.");
        }
        AppUser reviewer = loadManagedUser(principal);
        if (!isStudentRole(reviewer.getRole())) {
            throw new IllegalArgumentException("Only student users can create professor reviews.");
        }
        return reviewer;
    }

    private boolean isStudentRole(String role) {
        if (role == null || role.isBlank()) {
            return false;
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }
        return "USER".equals(normalized) || "STUDENT".equals(normalized);
    }

    private Map<Long, RatingStats> buildStatsMap(Collection<Long> professorIds) {
        if (professorIds == null || professorIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, RatingStats> result = new HashMap<>();
        for (ProfessorReviewRepository.RatingStatsProjection projection :
                professorReviewRepository.findRatingStatsByProfessorIds(professorIds)) {
            if (projection.getProfessorId() == null) {
                continue;
            }
            double avg = projection.getAverageRating() == null ? 0.0 : projection.getAverageRating();
            long count = projection.getReviewCount() == null ? 0L : projection.getReviewCount();
            result.put(projection.getProfessorId(), new RatingStats(avg, count));
        }
        return result;
    }

    private Map<Long, ProfessorExternalRatingResponse> buildPrimaryExternalRatingsMap(Collection<Long> professorIds) {
        if (professorIds == null || professorIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<ProfessorExternalRating>> ratingsByProfessor = new HashMap<>();
        for (ProfessorExternalRating rating : professorExternalRatingRepository.findByProfessorIdIn(professorIds)) {
            if (rating.getProfessor() == null) {
                continue;
            }
            ratingsByProfessor
                    .computeIfAbsent(rating.getProfessor().getId(), ignored -> new ArrayList<>())
                    .add(rating);
        }

        Map<Long, ProfessorExternalRatingResponse> result = new HashMap<>();
        for (Map.Entry<Long, List<ProfessorExternalRating>> entry : ratingsByProfessor.entrySet()) {
            ProfessorExternalRating primary = pickPrimaryExternalRating(entry.getValue());
            if (primary != null) {
                result.put(entry.getKey(), toExternalRatingResponse(primary));
            }
        }
        return result;
    }

    private List<ProfessorExternalRatingResponse> getExternalRatingsForProfessor(long professorId) {
        List<ProfessorExternalRating> ratings = new ArrayList<>(professorExternalRatingRepository.findByProfessorId(professorId));
        ratings.sort(externalRatingComparator());
        return ratings.stream()
                .map(this::toExternalRatingResponse)
                .toList();
    }

    private ProfessorExternalRating pickPrimaryExternalRating(Collection<ProfessorExternalRating> ratings) {
        if (ratings == null || ratings.isEmpty()) {
            return null;
        }
        return ratings.stream()
                .filter(Objects::nonNull)
                .sorted(externalRatingComparator())
                .findFirst()
                .orElse(null);
    }

    private Comparator<ProfessorExternalRating> externalRatingComparator() {
        return Comparator
                .comparingInt((ProfessorExternalRating rating) -> sourcePriority(rating.getSourceSystem()))
                .thenComparingLong(rating -> rating.getReviewCount() == null ? -1L : rating.getReviewCount())
                .thenComparingDouble(rating -> rating.getAverageRating() == null ? -1.0 : rating.getAverageRating())
                .reversed();
    }

    private ProfessorExternalRatingResponse toExternalRatingResponse(ProfessorExternalRating rating) {
        return new ProfessorExternalRatingResponse(
                rating.getSourceSystem(),
                sourceLabelFor(rating.getSourceSystem()),
                rating.getExternalId(),
                rating.getSourceUrl(),
                rating.getAverageRating(),
                rating.getReviewCount(),
                rating.getDifficultyRating(),
                rating.getWouldTakeAgainPercent(),
                rating.getCapturedAt(),
                rating.getUpdatedAt());
    }

    private int sourcePriority(String sourceSystem) {
        if (RATE_MY_PROFESSORS.equals(sourceSystem)) {
            return 100;
        }
        if (sourceSystem == null || sourceSystem.isBlank()) {
            return 0;
        }
        return 10;
    }

    private String sourceLabelFor(String sourceSystem) {
        if (sourceSystem == null || sourceSystem.isBlank()) {
            return "External Rating";
        }
        if (RATE_MY_PROFESSORS.equals(sourceSystem)) {
            return "Rate My Professors";
        }

        StringBuilder label = new StringBuilder();
        for (String token : sourceSystem.toLowerCase(Locale.ROOT).split("[_\\s]+")) {
            if (token.isBlank()) {
                continue;
            }
            if (!label.isEmpty()) {
                label.append(' ');
            }
            label.append(Character.toUpperCase(token.charAt(0)));
            if (token.length() > 1) {
                label.append(token.substring(1));
            }
        }
        return label.isEmpty() ? "External Rating" : label.toString();
    }

    private Map<Integer, Long> initRatingBreakdown() {
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        breakdown.put(5, 0L);
        breakdown.put(4, 0L);
        breakdown.put(3, 0L);
        breakdown.put(2, 0L);
        breakdown.put(1, 0L);
        return breakdown;
    }

    private ProfessorReviewResponse toReviewResponse(ProfessorReview review, AppUser viewer) {
        boolean editable = viewer != null && review.getReviewer().getId() == viewer.getId();
        boolean anonymized = review.isAnonymous() && !editable;
        Long reviewerId = anonymized ? null : review.getReviewer().getId();
        String reviewerName = anonymized
                ? "Anonymous Student"
                : buildDisplayName(review.getReviewer());

        return new ProfessorReviewResponse(
                review.getId(),
                review.getRating(),
                review.getDifficultyRating(),
                review.getWorkloadRating(),
                review.getWouldTakeAgain(),
                review.getClassTaken(),
                review.getPeriodTaken(),
                review.getGradeReceived(),
                review.getPositives(),
                review.getNegatives(),
                review.getWouldLikeToSee(),
                review.getStudyTips(),
                review.isAnonymous(),
                reviewerId,
                reviewerName,
                review.getCreatedAt(),
                review.getUpdatedAt(),
                editable);
    }

    private String buildDisplayName(AppUser user) {
        String first = trimToNull(user.getFirstName());
        String last = trimToNull(user.getLastName());
        String combined = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
        if (!combined.isBlank()) {
            return combined;
        }
        String username = trimToNull(user.getUsername());
        if (username != null) {
            return username;
        }
        return "Student #" + user.getId();
    }

    private void applyReviewRequest(ProfessorReview review, ProfessorReviewRequest request, boolean creating) {
        if (request == null) {
            throw new IllegalArgumentException("Review payload is required.");
        }

        Integer resolvedRating = request.rating();
        if (!creating && resolvedRating == null) {
            resolvedRating = review.getRating();
        }
        validateRating(resolvedRating, "Overall rating");
        review.setRating(resolvedRating);

        Integer difficulty = request.difficultyRating();
        if (!creating && difficulty == null) {
            difficulty = review.getDifficultyRating();
        }
        validateOptionalRating(difficulty, "Difficulty rating");
        review.setDifficultyRating(difficulty);

        Integer workload = request.workloadRating();
        if (!creating && workload == null) {
            workload = review.getWorkloadRating();
        }
        validateOptionalRating(workload, "Workload rating");
        review.setWorkloadRating(workload);

        if (request.wouldTakeAgain() != null || creating) {
            review.setWouldTakeAgain(request.wouldTakeAgain());
        }
        if (request.anonymous() != null || creating) {
            review.setAnonymous(Boolean.TRUE.equals(request.anonymous()));
        }

        if (request.classTaken() != null || creating) {
            review.setClassTaken(normalizeDisplayText(request.classTaken(), 80));
        }
        if (request.periodTaken() != null || creating) {
            review.setPeriodTaken(normalizeDisplayText(request.periodTaken(), 120));
        }
        if (request.gradeReceived() != null || creating) {
            review.setGradeReceived(normalizeDisplayText(request.gradeReceived(), 24));
        }
        if (request.positives() != null || creating) {
            review.setPositives(normalizeDisplayText(request.positives(), 5000));
        }
        if (request.negatives() != null || creating) {
            review.setNegatives(normalizeDisplayText(request.negatives(), 5000));
        }
        if (request.wouldLikeToSee() != null || creating) {
            review.setWouldLikeToSee(normalizeDisplayText(request.wouldLikeToSee(), 5000));
        }
        if (request.studyTips() != null || creating) {
            review.setStudyTips(normalizeDisplayText(request.studyTips(), 5000));
        }
    }

    private void validateRating(Integer rating, String field) {
        if (rating == null) {
            throw new IllegalArgumentException(field + " is required.");
        }
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException(field + " must be between 1 and 5.");
        }
    }

    private void validateOptionalRating(Integer rating, String field) {
        if (rating == null) {
            return;
        }
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException(field + " must be between 1 and 5.");
        }
    }

    private Professor resolveProfessorForExternalRating(ProfessorExternalRatingImportRecord row) {
        if (row.professorId() != null) {
            return professorRepository.findById(row.professorId()).orElse(null);
        }

        String normalizedName = normalizeLookupToken(row.professorName());
        if (normalizedName.isBlank()) {
            return null;
        }

        String normalizedDepartment = normalizeLookupToken(row.department());
        if (!normalizedDepartment.isBlank()) {
            return professorRepository.findFirstByNormalizedNameAndNormalizedDepartment(
                    normalizedName,
                    normalizedDepartment).orElse(null);
        }

        List<Professor> matches = professorRepository.findAllByNormalizedName(normalizedName);
        return matches.size() == 1 ? matches.getFirst() : null;
    }

    private Instant parseInstant(String raw) {
        String trimmed = trimToNull(raw);
        if (trimmed == null) {
            return null;
        }
        try {
            return Instant.parse(trimmed);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String normalizeRateMyProfessorsUrl(String raw) {
        String normalized = normalizeDisplayText(raw, 1000);
        if (normalized == null) {
            throw new IllegalArgumentException("A Rate My Professors link is required.");
        }

        URI uri;
        try {
            uri = URI.create(normalized);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Enter a valid Rate My Professors URL.");
        }

        String scheme = trimToNull(uri.getScheme());
        String host = trimToNull(uri.getHost());
        if (scheme == null
                || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))
                || host == null
                || !host.toLowerCase(Locale.ROOT).contains("ratemyprofessors.com")) {
            throw new IllegalArgumentException("Enter a valid Rate My Professors URL.");
        }

        return normalized;
    }

    private String extractRateMyProfessorsExternalId(String sourceUrl) {
        if (sourceUrl == null) {
            return null;
        }
        Matcher matcher = RATE_MY_PROFESSORS_ID_PATTERN.matcher(sourceUrl);
        return matcher.find() ? matcher.group(1) : null;
    }

    private boolean hasExternalStats(Double rating, Long reviewCount) {
        return rating != null || reviewCount != null;
    }

    private boolean hasValidExternalStats(Double rating, Long reviewCount) {
        if (rating == null && reviewCount == null) {
            return true;
        }
        return isValidExternalAverage(rating) && isValidExternalReviewCount(reviewCount);
    }

    private boolean isValidExternalAverage(Double rating) {
        return rating != null && rating >= 0.0 && rating <= 5.0;
    }

    private boolean isValidExternalReviewCount(Long reviewCount) {
        return reviewCount != null && reviewCount >= 0;
    }

    private boolean isValidExternalDifficulty(Double rating) {
        return rating == null || (rating >= 0.0 && rating <= 5.0);
    }

    private boolean isValidWouldTakeAgainPercent(Integer wouldTakeAgainPercent) {
        return wouldTakeAgainPercent == null
                || (wouldTakeAgainPercent >= 0 && wouldTakeAgainPercent <= 100);
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        if (values == null) {
            return null;
        }
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private int sanitizePageSize(Integer requested) {
        int value = requested == null ? DEFAULT_PAGE_SIZE : requested;
        return Math.max(1, Math.min(MAX_PAGE_SIZE, value));
    }

    private String normalizeSort(String sort) {
        String normalized = normalizeSearchToken(sort);
        if ("top".equals(normalized) || "highest".equals(normalized)) {
            return "rating";
        }
        return "rating".equals(normalized) ? "rating" : "name";
    }

    private String normalizeSearchToken(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeLookupToken(String raw) {
        return normalizeSearchToken(raw);
    }

    private String normalizeSource(String sourceSystem, String sourceHint) {
        String candidate = trimToNull(sourceSystem);
        if (candidate == null) {
            candidate = trimToNull(sourceHint);
        }
        if (candidate == null) {
            return null;
        }
        return candidate.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]+", "_");
    }

    private String normalizeDepartment(String rawDepartment, String rawTitle) {
        return normalizeDisplayText(
                ProfessorDirectoryNormalizer.canonicalizeDepartment(rawDepartment, rawTitle),
                220);
    }

    private String normalizeDisplayText(String raw, int maxLength) {
        String trimmed = trimToNull(raw);
        if (trimmed == null) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            return trimmed.substring(0, maxLength);
        }
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}

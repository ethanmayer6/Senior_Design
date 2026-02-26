package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional
public class CourseReviewService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final CourseRepository courseRepository;
    private final CourseReviewRepository courseReviewRepository;
    private final UserRepository userRepository;

    private record RatingStats(double average, long count) {
    }

    public CourseReviewService(
            CourseRepository courseRepository,
            CourseReviewRepository courseReviewRepository,
            UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.courseReviewRepository = courseReviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CourseReviewPageResponse getCourseReviews(
            long courseId,
            AppUser principal,
            Integer page,
            Integer size) {
        getCourseOrThrow(courseId);
        AppUser viewer = principal == null ? null : loadManagedUser(principal);

        int safePage = Math.max(0, page == null ? 0 : page);
        int safeSize = sanitizePageSize(size);
        Page<CourseReview> reviews = courseReviewRepository.findByCourseIdOrderByCreatedAtDesc(
                courseId,
                PageRequest.of(safePage, safeSize));

        return new CourseReviewPageResponse(
                reviews.getContent().stream().map(review -> toReviewResponse(review, viewer)).toList(),
                reviews.getNumber(),
                reviews.getSize(),
                reviews.getTotalElements(),
                reviews.getTotalPages());
    }

    @Transactional(readOnly = true)
    public CourseReviewSummaryResponse getCourseReviewSummary(long courseId, AppUser principal) {
        Course course = getCourseOrThrow(courseId);
        AppUser viewer = principal == null ? null : loadManagedUser(principal);

        RatingStats stats = courseReviewRepository.findRatingStatsByCourseId(courseId)
                .map(view -> new RatingStats(
                        view.getAverageRating() == null ? 0.0 : view.getAverageRating(),
                        view.getReviewCount() == null ? 0L : view.getReviewCount()))
                .orElse(new RatingStats(0.0, 0L));

        Map<Integer, Long> ratingBreakdown = initRatingBreakdown();
        for (CourseReviewRepository.RatingBreakdownProjection projection
                : courseReviewRepository.findRatingBreakdown(courseId)) {
            if (projection.getRating() == null || projection.getReviewCount() == null) {
                continue;
            }
            ratingBreakdown.put(projection.getRating(), projection.getReviewCount());
        }

        CourseReviewResponse myReview = null;
        if (viewer != null) {
            myReview = courseReviewRepository.findByCourseAndReviewer(course, viewer)
                    .map(review -> toReviewResponse(review, viewer))
                    .orElse(null);
        }

        return new CourseReviewSummaryResponse(
                stats.average(),
                stats.count(),
                ratingBreakdown,
                myReview,
                viewer != null && isStudentRole(viewer.getRole()));
    }

    @Transactional(readOnly = true)
    public CourseReviewResponse getMyCourseReview(long courseId, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Course course = getCourseOrThrow(courseId);
        return courseReviewRepository.findByCourseAndReviewer(course, reviewer)
                .map(review -> toReviewResponse(review, reviewer))
                .orElse(null);
    }

    public CourseReviewResponse createCourseReview(long courseId, CourseReviewRequest request, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Course course = getCourseOrThrow(courseId);

        if (courseReviewRepository.existsByCourseAndReviewer(course, reviewer)) {
            throw new IllegalArgumentException("You have already reviewed this course. Edit your review instead.");
        }

        CourseReview review = new CourseReview();
        review.setCourse(course);
        review.setReviewer(reviewer);
        applyReviewRequest(review, request, true);

        CourseReview saved = courseReviewRepository.save(review);
        return toReviewResponse(saved, reviewer);
    }

    public CourseReviewResponse updateMyCourseReview(long courseId, CourseReviewRequest request, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Course course = getCourseOrThrow(courseId);

        CourseReview review = courseReviewRepository.findByCourseAndReviewer(course, reviewer)
                .orElseThrow(() -> new IllegalArgumentException("No review found to update for this course."));

        applyReviewRequest(review, request, false);
        CourseReview saved = courseReviewRepository.save(review);
        return toReviewResponse(saved, reviewer);
    }

    public void deleteMyCourseReview(long courseId, AppUser principal) {
        AppUser reviewer = requireStudentPrincipal(principal);
        Course course = getCourseOrThrow(courseId);
        CourseReview review = courseReviewRepository.findByCourseAndReviewer(course, reviewer)
                .orElseThrow(() -> new IllegalArgumentException("No review found to delete for this course."));
        courseReviewRepository.delete(review);
    }

    private Course getCourseOrThrow(long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));
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
            throw new IllegalArgumentException("Only student users can create course reviews.");
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

    private Map<Integer, Long> initRatingBreakdown() {
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        breakdown.put(5, 0L);
        breakdown.put(4, 0L);
        breakdown.put(3, 0L);
        breakdown.put(2, 0L);
        breakdown.put(1, 0L);
        return breakdown;
    }

    private CourseReviewResponse toReviewResponse(CourseReview review, AppUser viewer) {
        boolean editable = viewer != null && review.getReviewer().getId() == viewer.getId();
        boolean anonymized = review.isAnonymous() && !editable;
        Long reviewerId = anonymized ? null : review.getReviewer().getId();
        String reviewerName = anonymized
                ? "Anonymous Student"
                : buildDisplayName(review.getReviewer());

        return new CourseReviewResponse(
                review.getId(),
                review.getRating(),
                review.getDifficultyRating(),
                review.getWorkloadRating(),
                review.getWouldTakeAgain(),
                review.getSemesterTaken(),
                review.getInstructorName(),
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

    private void applyReviewRequest(CourseReview review, CourseReviewRequest request, boolean creating) {
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

        if (request.semesterTaken() != null || creating) {
            review.setSemesterTaken(normalizeDisplayText(request.semesterTaken(), 120));
        }
        if (request.instructorName() != null || creating) {
            review.setInstructorName(normalizeDisplayText(request.instructorName(), 200));
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

    private int sanitizePageSize(Integer requested) {
        int value = requested == null ? DEFAULT_PAGE_SIZE : requested;
        return Math.max(1, Math.min(MAX_PAGE_SIZE, value));
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

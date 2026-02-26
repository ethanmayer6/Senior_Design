package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.User.AppUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/courses")
public class CourseReviewController {

    private final CourseReviewService courseReviewService;

    public CourseReviewController(CourseReviewService courseReviewService) {
        this.courseReviewService = courseReviewService;
    }

    @GetMapping("/{courseId}/reviews")
    public CourseReviewPageResponse getCourseReviews(
            @PathVariable long courseId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        return courseReviewService.getCourseReviews(courseId, user, page, size);
    }

    @GetMapping("/{courseId}/reviews/summary")
    public CourseReviewSummaryResponse getCourseReviewSummary(
            @PathVariable long courseId,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        return courseReviewService.getCourseReviewSummary(courseId, user);
    }

    @GetMapping("/{courseId}/reviews/me")
    public ResponseEntity<CourseReviewResponse> getMyReview(
            @PathVariable long courseId,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        CourseReviewResponse response = courseReviewService.getMyCourseReview(courseId, user);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{courseId}/reviews")
    public CourseReviewResponse createReview(
            @PathVariable long courseId,
            @RequestBody CourseReviewRequest request,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        return courseReviewService.createCourseReview(courseId, request, user);
    }

    @PutMapping("/{courseId}/reviews/me")
    public CourseReviewResponse updateMyReview(
            @PathVariable long courseId,
            @RequestBody CourseReviewRequest request,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        return courseReviewService.updateMyCourseReview(courseId, request, user);
    }

    @DeleteMapping("/{courseId}/reviews/me")
    public ResponseEntity<Void> deleteMyReview(
            @PathVariable long courseId,
            Authentication auth) {
        AppUser user = resolvePrincipal(auth);
        courseReviewService.deleteMyCourseReview(courseId, user);
        return ResponseEntity.noContent().build();
    }

    private AppUser resolvePrincipal(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof AppUser)) {
            return null;
        }
        return (AppUser) auth.getPrincipal();
    }
}

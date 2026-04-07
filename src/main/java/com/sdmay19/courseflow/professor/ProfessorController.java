package com.sdmay19.courseflow.professor;

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

import java.util.List;

@RestController
@RequestMapping("/api/professors")
public class ProfessorController {

    private final ProfessorService professorService;

    public ProfessorController(ProfessorService professorService) {
        this.professorService = professorService;
    }

    @GetMapping
    public ProfessorBrowseResponse browseProfessors(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return professorService.browseProfessors(query, department, page, size, sort);
    }

    @GetMapping("/status")
    public ProfessorDirectoryStatusResponse getDirectoryStatus() {
        return professorService.getDirectoryStatus();
    }

    @GetMapping("/departments")
    public List<String> getDepartments() {
        return professorService.getAllDepartments();
    }

    @GetMapping("/{professorId}")
    public ProfessorDetailResponse getProfessorDetail(
            @PathVariable long professorId,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        return professorService.getProfessorDetail(professorId, user);
    }

    @GetMapping("/{professorId}/reviews")
    public ProfessorReviewPageResponse getProfessorReviews(
            @PathVariable long professorId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        return professorService.getProfessorReviews(professorId, user, page, size);
    }

    @GetMapping("/{professorId}/reviews/me")
    public ResponseEntity<ProfessorReviewResponse> getMyReview(
            @PathVariable long professorId,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        ProfessorReviewResponse response = professorService.getMyProfessorReview(professorId, user);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{professorId}/reviews")
    public ProfessorReviewResponse createReview(
            @PathVariable long professorId,
            @RequestBody ProfessorReviewRequest request,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        return professorService.createProfessorReview(professorId, request, user);
    }

    @PutMapping("/{professorId}/reviews/me")
    public ProfessorReviewResponse updateMyReview(
            @PathVariable long professorId,
            @RequestBody ProfessorReviewRequest request,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        return professorService.updateMyProfessorReview(professorId, request, user);
    }

    @DeleteMapping("/{professorId}/reviews/me")
    public ResponseEntity<Void> deleteMyReview(
            @PathVariable long professorId,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        professorService.deleteMyProfessorReview(professorId, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{professorId}/rate-my-professors-link")
    public ResponseEntity<ProfessorExternalRatingResponse> addMissingRateMyProfessorsLink(
            @PathVariable long professorId,
            @RequestBody ProfessorRateMyProfessorsLinkRequest request,
            Authentication auth) {
        AppUser user = auth == null ? null : (AppUser) auth.getPrincipal();
        ProfessorExternalRatingResponse response = professorService.addMissingRateMyProfessorsLink(
                professorId,
                request == null ? null : request.sourceUrl(),
                user);
        return ResponseEntity.ok(response);
    }
}

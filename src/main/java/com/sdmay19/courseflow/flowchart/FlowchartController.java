package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.CourseMapRequest;
import com.sdmay19.courseflow.semester.CourseUpdateRequest;
import com.sdmay19.courseflow.semester.Semester;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/flowchart")
public class FlowchartController {

    private final FlowchartService flowchartService;
    private final FlowchartCommentService flowchartCommentService;

    public FlowchartController(FlowchartService flowchartService, FlowchartCommentService flowchartCommentService) {
        this.flowchartService = flowchartService;
        this.flowchartCommentService = flowchartCommentService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Flowchart> createFlowchart(@RequestBody FlowchartDTO dto) {
        Flowchart flowchart = flowchartService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(flowchart);
    }

    // READ
    @GetMapping("/user")
    public FlowchartResponse getMyFlowchart(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByUser(user);
        return FlowchartResponse.from(flowchart);
    }

    @GetMapping("/user/versions")
    public List<FlowchartResponse> getMyFlowchartVersions(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return flowchartService.listByUser(user).stream()
                .map(FlowchartResponse::from)
                .toList();
    }

    @PostMapping("/user/versions/duplicate")
    public ResponseEntity<FlowchartResponse> duplicateMyFlowchartVersion(
            Authentication auth,
            @RequestBody(required = false) FlowchartDuplicateRequest request) {
        AppUser user = (AppUser) auth.getPrincipal();
        Long sourceFlowchartId = request == null ? null : request.sourceFlowchartId();
        String title = request == null ? null : request.title();
        Flowchart duplicated = flowchartService.duplicateForUser(user, sourceFlowchartId, title);
        return ResponseEntity.status(HttpStatus.CREATED).body(FlowchartResponse.from(duplicated));
    }

    @GetMapping("/user/insights")
    public FlowchartInsightsResponse getMyFlowchartInsights(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return flowchartService.getInsightsByUser(user);
    }

    @GetMapping("/user/requirements/coverage")
    public FlowchartRequirementCoverageResponse getMyRequirementCoverage(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return flowchartService.getRequirementCoverageByUser(user);
    }

    @GetMapping("/user/{userId}")
    public FlowchartResponse getFlowchartByUserId(Authentication auth, @PathVariable long userId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        assertCanViewStudentFlowchart(requester, userId);
        Flowchart flowchart = flowchartService.getByUserId(userId);
        return FlowchartResponse.from(flowchart);
    }

    @GetMapping("/user/{userId}/versions")
    public List<FlowchartResponse> getFlowchartVersionsByUserId(Authentication auth, @PathVariable long userId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        assertCanViewStudentFlowchart(requester, userId);
        return flowchartService.listByUserId(userId).stream()
                .map(FlowchartResponse::from)
                .toList();
    }

    @GetMapping("/user/{userId}/insights")
    public FlowchartInsightsResponse getFlowchartInsightsByUserId(Authentication auth, @PathVariable long userId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        assertCanViewStudentFlowchart(requester, userId);
        return flowchartService.getInsightsByUserId(userId);
    }

    @GetMapping("/user/{userId}/requirements/coverage")
    public FlowchartRequirementCoverageResponse getRequirementCoverageByUserId(
            Authentication auth,
            @PathVariable long userId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        assertCanViewStudentFlowchart(requester, userId);
        return flowchartService.getRequirementCoverageByUserId(userId);
    }

    @GetMapping("/{flowchartId}/comments")
    public List<FlowchartCommentResponse> getFlowchartComments(Authentication auth, @PathVariable long flowchartId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        return flowchartCommentService.listComments(requester, flowchartId).stream()
                .map(FlowchartCommentResponse::from)
                .toList();
    }

    @PostMapping("/{flowchartId}/comments")
    public ResponseEntity<FlowchartCommentResponse> createFlowchartComment(
            Authentication auth,
            @PathVariable long flowchartId,
            @RequestBody FlowchartCommentRequest request) {
        AppUser requester = (AppUser) auth.getPrincipal();
        FlowchartComment created = flowchartCommentService.createComment(
                requester,
                flowchartId,
                request.body(),
                request.noteX(),
                request.noteY());
        return ResponseEntity.status(HttpStatus.CREATED).body(FlowchartCommentResponse.from(created));
    }

    @PutMapping("/comments/{commentId}")
    public FlowchartCommentResponse updateFlowchartComment(
            Authentication auth,
            @PathVariable long commentId,
            @RequestBody FlowchartCommentRequest request) {
        AppUser requester = (AppUser) auth.getPrincipal();
        FlowchartComment updated = flowchartCommentService.updateComment(
                requester,
                commentId,
                request.body(),
                request.noteX(),
                request.noteY());
        return FlowchartCommentResponse.from(updated);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteFlowchartComment(Authentication auth, @PathVariable long commentId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        flowchartCommentService.deleteComment(requester, commentId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/comments/{commentId}/dismiss")
    public FlowchartCommentResponse dismissFlowchartComment(
            Authentication auth,
            @PathVariable long commentId,
            @RequestBody FlowchartCommentDismissRequest request) {
        AppUser requester = (AppUser) auth.getPrincipal();
        boolean dismissed = request.dismissed() == null || request.dismissed();
        FlowchartComment updated = flowchartCommentService.setDismissed(requester, commentId, dismissed);
        return FlowchartCommentResponse.from(updated);
    }

    @GetMapping("/id/{id}")
    public Flowchart getById(Authentication auth, @PathVariable long id) {
        AppUser requester = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByIdInitialized(id);
        assertCanAccessFlowchart(requester, flowchart);
        return flowchart;
    }

    @GetMapping("/{flowchartId}/insights")
    public FlowchartInsightsResponse getFlowchartInsightsByFlowchartId(Authentication auth, @PathVariable long flowchartId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByIdInitialized(flowchartId);
        assertCanAccessFlowchart(requester, flowchart);
        return flowchartService.getInsightsByFlowchartId(flowchartId);
    }

    @GetMapping("/{flowchartId}/requirements/coverage")
    public FlowchartRequirementCoverageResponse getRequirementCoverageByFlowchartId(
            Authentication auth,
            @PathVariable long flowchartId) {
        AppUser requester = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByIdInitialized(flowchartId);
        assertCanAccessFlowchart(requester, flowchart);
        return flowchartService.getRequirementCoverageByFlowchartId(flowchartId);
    }

    @GetMapping("/courses/{id}/{status}")
    public List<Course> getCourseByStatus(@PathVariable long id, @PathVariable Status status) {
        return flowchartService.getCourseByStatus(id, status);
    }

    @GetMapping("/getall")
    public List<Flowchart> getAllFlowCharts() {
        return flowchartService.getAll();
    }

    public record CourseResponse(
            long id,
            String name,
            String courseIdent,
            int credits,
            Set<String> prerequisites,
            String prereq_txt,
            String description,
            String hours,
            String offered) {
        static CourseResponse from(Course c) {
            return new CourseResponse(
                    c.getId(),
                    c.getName(),
                    c.getCourseIdent(),
                    c.getCredits(),
                    c.getPrerequisites(),
                    c.getPrereq_txt(),
                    c.getDescription(),
                    c.getHours(),
                    c.getOffered());
        }
    }

    public record SemesterResponse(
            long id,
            int year,
            String term,
            String major,
            List<CourseResponse> courses) {
        static SemesterResponse from(Semester s) {
            List<CourseResponse> courses = new ArrayList<>();
            if (s.getCourses() != null) {
                for (Course c : s.getCourses()) {
                    courses.add(CourseResponse.from(c));
                }
            }
            return new SemesterResponse(
                    s.getId(),
                    s.getYear(),
                    s.getTerm() == null ? null : s.getTerm().name(),
                    s.getMajor(),
                    courses);
        }
    }

    public record FlowchartResponse(
            long id,
            int totalCredits,
            int creditsSatisfied,
            String title,
            Map<String, Status> courseStatusMap,
            String majorName,
            List<SemesterResponse> semesters) {
        static FlowchartResponse from(Flowchart f) {
            List<SemesterResponse> semesters = new ArrayList<>();
            if (f.getSemesters() != null) {
                for (Semester s : f.getSemesters()) {
                    semesters.add(SemesterResponse.from(s));
                }
            }
            return new FlowchartResponse(
                    f.getId(),
                    f.getTotalCredits(),
                    f.getCreditsSatisfied(),
                    f.getTitle(),
                    f.getCourseStatusMap(),
                    f.getMajor() == null ? null : f.getMajor().getName(),
                    semesters);
        }
    }

    public record FlowchartCommentRequest(String body, Double noteX, Double noteY) {
    }

    public record FlowchartCommentDismissRequest(Boolean dismissed) {
    }

    public record FlowchartDuplicateRequest(Long sourceFlowchartId, String title) {
    }

    public record FlowchartCommentResponse(
            long id,
            long flowchartId,
            long authorId,
            String authorName,
            String authorRole,
            String body,
            Double noteX,
            Double noteY,
            boolean dismissed,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        static FlowchartCommentResponse from(FlowchartComment comment) {
            AppUser author = comment.getAuthor();
            String firstName = author == null || author.getFirstName() == null ? "" : author.getFirstName().trim();
            String lastName = author == null || author.getLastName() == null ? "" : author.getLastName().trim();
            String fullName = (firstName + " " + lastName).trim();
            String fallbackName = author == null ? "Unknown User" : author.getUsername();
            String authorName = fullName.isBlank() ? fallbackName : fullName;
            String authorRole = author == null ? "" : author.getRole();

            return new FlowchartCommentResponse(
                    comment.getId(),
                    comment.getFlowchart().getId(),
                    author == null ? 0L : author.getId(),
                    authorName,
                    authorRole,
                    comment.getBody(),
                    comment.getNoteX(),
                    comment.getNoteY(),
                    comment.isDismissed(),
                    comment.getCreatedAt(),
                    comment.getUpdatedAt());
        }
    }

    // UPDATE
    @PatchMapping("/update/{id}/course")
    public Flowchart updateCourseMap(@PathVariable long id, @RequestBody CourseMapRequest req) {
        if (req.getOperation().equals("UPDATE")) {
            flowchartService.updateCourseStatus(id, req);
        }
        if (req.getOperation().equals("ADD")) {
            flowchartService.addCourse(id, req);
        }
        if (req.getOperation().equals("REMOVE")) {
            flowchartService.removeCourse(id, req);
        }

        Flowchart updated = flowchartService.getById(id);
        return ResponseEntity.ok(updated).getBody();
    }

    @PutMapping("/update/{id}")
    public Flowchart updateFlowchart(@PathVariable long id, @RequestBody FlowchartDTO flowchartDTO) {
        return flowchartService.update(id, flowchartDTO);
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable long id) {
        flowchartService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void assertCanViewStudentFlowchart(AppUser requester, long targetUserId) {
        if (requester.getId() == targetUserId) {
            return;
        }

        String normalizedRole = normalizeRole(requester.getRole());
        if ("ADVISOR".equals(normalizedRole) || "FACULTY".equals(normalizedRole) || "ADMIN".equals(normalizedRole)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to view this flowchart.");
    }

    private void assertCanAccessFlowchart(AppUser requester, Flowchart flowchart) {
        if (flowchart == null || flowchart.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Flowchart not found.");
        }
        assertCanViewStudentFlowchart(requester, flowchart.getUser().getId());
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            return normalized.substring("ROLE_".length());
        }
        return normalized;
    }
}

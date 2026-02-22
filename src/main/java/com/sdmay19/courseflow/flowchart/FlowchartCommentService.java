package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class FlowchartCommentService {

    private final FlowchartCommentRepository flowchartCommentRepository;
    private final FlowchartRequiredChangeRepository flowchartRequiredChangeRepository;
    private final FlowChartRepository flowChartRepository;

    public FlowchartCommentService(
            FlowchartCommentRepository flowchartCommentRepository,
            FlowchartRequiredChangeRepository flowchartRequiredChangeRepository,
            FlowChartRepository flowChartRepository) {
        this.flowchartCommentRepository = flowchartCommentRepository;
        this.flowchartRequiredChangeRepository = flowchartRequiredChangeRepository;
        this.flowChartRepository = flowChartRepository;
    }

    @Transactional(readOnly = true)
    public List<FlowchartComment> listComments(AppUser requester, long flowchartId) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        return flowchartCommentRepository.findAllByFlowchartOrderByCreatedAtAsc(flowchart);
    }

    public FlowchartComment createComment(
            AppUser requester,
            long flowchartId,
            Long parentCommentId,
            String body,
            Double noteX,
            Double noteY) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        FlowchartComment parentComment = null;
        if (parentCommentId != null) {
            parentComment = flowchartCommentRepository.findByIdAndFlowchart(parentCommentId, flowchart)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent comment not found."));
        }
        FlowchartComment comment = new FlowchartComment(
                flowchart,
                requester,
                parentComment,
                normalizeBody(body),
                normalizeCoordinate(noteX),
                normalizeCoordinate(noteY),
                false);
        return flowchartCommentRepository.save(comment);
    }

    public FlowchartComment updateComment(
            AppUser requester,
            long commentId,
            String body,
            Double noteX,
            Double noteY) {
        FlowchartComment comment = flowchartCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));

        assertCanAccessFlowchart(requester, comment.getFlowchart());
        comment.setBody(normalizeBody(body));
        comment.setNoteX(normalizeCoordinate(noteX));
        comment.setNoteY(normalizeCoordinate(noteY));
        return flowchartCommentRepository.save(comment);
    }

    public void deleteComment(AppUser requester, long commentId) {
        FlowchartComment comment = flowchartCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        assertCanAccessFlowchart(requester, comment.getFlowchart());
        flowchartCommentRepository.delete(comment);
    }

    public FlowchartComment setDismissed(AppUser requester, long commentId, boolean dismissed) {
        FlowchartComment comment = flowchartCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        assertCanDismiss(requester, comment.getFlowchart());
        comment.setDismissed(dismissed);
        return flowchartCommentRepository.save(comment);
    }

    @Transactional(readOnly = true)
    public FlowchartReviewResponse getReview(AppUser requester, long flowchartId) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        return FlowchartReviewResponse.from(flowchart);
    }

    public FlowchartReviewResponse updateReview(
            AppUser requester,
            long flowchartId,
            FlowchartReviewStatus status,
            String reviewNotes) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        assertCanReview(requester);
        flowchart.setReviewStatus(status == null ? FlowchartReviewStatus.PENDING : status);
        flowchart.setReviewNotes(normalizeReviewNotes(reviewNotes));
        flowchart.setReviewedAt(LocalDateTime.now());
        flowchart.setReviewedByUserId(requester.getId());
        Flowchart saved = flowChartRepository.save(flowchart);
        return FlowchartReviewResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<FlowchartRequiredChange> listRequiredChanges(AppUser requester, long flowchartId) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        return flowchartRequiredChangeRepository.findAllByFlowchartOrderByCreatedAtAsc(flowchart);
    }

    public FlowchartRequiredChange createRequiredChange(AppUser requester, long flowchartId, String label) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        assertCanReview(requester);
        FlowchartRequiredChange item = new FlowchartRequiredChange(
                flowchart,
                requester,
                normalizeChecklistLabel(label),
                false);
        return flowchartRequiredChangeRepository.save(item);
    }

    public FlowchartRequiredChange updateRequiredChange(AppUser requester, long itemId, String label, Boolean completed) {
        FlowchartRequiredChange item = flowchartRequiredChangeRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist item not found."));
        Flowchart flowchart = item.getFlowchart();
        assertCanAccessFlowchart(requester, flowchart);
        boolean canManageContent = canReview(requester);
        boolean isOwner = requester != null
                && flowchart != null
                && flowchart.getUser() != null
                && requester.getId() == flowchart.getUser().getId();
        if (!canManageContent && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to update checklist items.");
        }
        if (label != null) {
            if (!canManageContent) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only advisors/faculty/admin can edit checklist text.");
            }
            item.setLabel(normalizeChecklistLabel(label));
        }
        if (completed != null) {
            item.setCompleted(completed);
        }
        return flowchartRequiredChangeRepository.save(item);
    }

    public void deleteRequiredChange(AppUser requester, long itemId) {
        FlowchartRequiredChange item = flowchartRequiredChangeRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist item not found."));
        assertCanAccessFlowchart(requester, item.getFlowchart());
        assertCanReview(requester);
        flowchartRequiredChangeRepository.delete(item);
    }

    private Flowchart getAccessibleFlowchart(AppUser requester, long flowchartId) {
        Flowchart flowchart = flowChartRepository.findById(flowchartId)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + flowchartId + " not found."));
        assertCanAccessFlowchart(requester, flowchart);
        return flowchart;
    }

    private void assertCanAccessFlowchart(AppUser requester, Flowchart flowchart) {
        if (requester == null || flowchart == null || flowchart.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to access this flowchart.");
        }

        if (requester.getId() == flowchart.getUser().getId()) {
            return;
        }

        String role = normalizeRole(requester.getRole());
        if ("ADVISOR".equals(role) || "FACULTY".equals(role) || "ADMIN".equals(role)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to access this flowchart.");
    }

    private void assertCanDismiss(AppUser requester, Flowchart flowchart) {
        if (requester == null || flowchart == null || flowchart.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to dismiss this comment.");
        }

        if (requester.getId() == flowchart.getUser().getId()) {
            return;
        }

        String role = normalizeRole(requester.getRole());
        if ("ADMIN".equals(role)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the student owner can dismiss this comment.");
    }

    private void assertCanReview(AppUser requester) {
        if (!canReview(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only advisors/faculty/admin can review plans.");
        }
    }

    private boolean canReview(AppUser requester) {
        String role = normalizeRole(requester == null ? null : requester.getRole());
        return "ADVISOR".equals(role) || "FACULTY".equals(role) || "ADMIN".equals(role);
    }

    private String normalizeBody(String body) {
        String normalized = body == null ? "" : body.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text cannot be empty.");
        }
        if (normalized.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text cannot exceed 2000 characters.");
        }
        return normalized;
    }

    private Double normalizeCoordinate(Double coordinate) {
        if (coordinate == null) {
            return null;
        }
        if (!Double.isFinite(coordinate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid note coordinate.");
        }
        return coordinate;
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

    private String normalizeChecklistLabel(String label) {
        String normalized = label == null ? "" : label.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checklist item text cannot be empty.");
        }
        if (normalized.length() > 300) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checklist item text cannot exceed 300 characters.");
        }
        return normalized;
    }

    private String normalizeReviewNotes(String notes) {
        if (notes == null) {
            return null;
        }
        String normalized = notes.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review notes cannot exceed 2000 characters.");
        }
        return normalized;
    }

    public record FlowchartReviewResponse(
            long flowchartId,
            FlowchartReviewStatus status,
            String reviewNotes,
            Long reviewedByUserId,
            LocalDateTime reviewedAt) {
        static FlowchartReviewResponse from(Flowchart flowchart) {
            return new FlowchartReviewResponse(
                    flowchart.getId(),
                    flowchart.getReviewStatus(),
                    flowchart.getReviewNotes(),
                    flowchart.getReviewedByUserId(),
                    flowchart.getReviewedAt());
        }
    }
}

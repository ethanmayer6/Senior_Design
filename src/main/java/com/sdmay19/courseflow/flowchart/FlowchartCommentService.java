package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class FlowchartCommentService {

    private final FlowchartCommentRepository flowchartCommentRepository;
    private final FlowChartRepository flowChartRepository;

    public FlowchartCommentService(
            FlowchartCommentRepository flowchartCommentRepository,
            FlowChartRepository flowChartRepository) {
        this.flowchartCommentRepository = flowchartCommentRepository;
        this.flowChartRepository = flowChartRepository;
    }

    @Transactional(readOnly = true)
    public List<FlowchartComment> listComments(AppUser requester, long flowchartId) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        return flowchartCommentRepository.findAllByFlowchartOrderByUpdatedAtDesc(flowchart);
    }

    public FlowchartComment createComment(
            AppUser requester,
            long flowchartId,
            String body,
            Double noteX,
            Double noteY) {
        Flowchart flowchart = getAccessibleFlowchart(requester, flowchartId);
        FlowchartComment comment = new FlowchartComment(
                flowchart,
                requester,
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
}

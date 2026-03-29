package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowchartCommentServiceTest {

    @Mock
    private FlowchartCommentRepository flowchartCommentRepository;

    @Mock
    private FlowchartRequiredChangeRepository flowchartRequiredChangeRepository;

    @Mock
    private FlowChartRepository flowChartRepository;

    @InjectMocks
    private FlowchartCommentService flowchartCommentService;

    @Test
    void createComment_trimsBodyAndAllowsOwners() {
        AppUser owner = user(14L, "USER");
        Flowchart flowchart = flowchart(7L, owner);
        when(flowChartRepository.findById(7L)).thenReturn(Optional.of(flowchart));
        when(flowchartCommentRepository.save(any(FlowchartComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowchartComment created = flowchartCommentService.createComment(owner, 7L, null, "  Needs one more elective.  ", 10.0, 20.0);

        assertThat(created.getBody()).isEqualTo("Needs one more elective.");
        assertThat(created.getNoteX()).isEqualTo(10.0);
        assertThat(created.getNoteY()).isEqualTo(20.0);
    }

    @Test
    void updateReview_requiresAdvisorFacultyOrAdminRole() {
        AppUser student = user(14L, "USER");
        Flowchart flowchart = flowchart(7L, student);
        when(flowChartRepository.findById(7L)).thenReturn(Optional.of(flowchart));

        assertThatThrownBy(() -> flowchartCommentService.updateReview(student, 7L, FlowchartReviewStatus.APPROVED, "Looks good"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only advisors/faculty/admin can review plans.");
    }

    @Test
    void updateReview_persistsNormalizedNotesAndReviewer() {
        AppUser owner = user(14L, "USER");
        AppUser advisor = user(77L, "ADVISOR");
        Flowchart flowchart = flowchart(7L, owner);
        when(flowChartRepository.findById(7L)).thenReturn(Optional.of(flowchart));
        when(flowChartRepository.save(any(Flowchart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowchartCommentService.FlowchartReviewResponse response =
                flowchartCommentService.updateReview(advisor, 7L, FlowchartReviewStatus.APPROVED, "  Approved with notes.  ");

        assertThat(response.status()).isEqualTo(FlowchartReviewStatus.APPROVED);
        assertThat(response.reviewNotes()).isEqualTo("Approved with notes.");
        assertThat(response.reviewedByUserId()).isEqualTo(77L);
    }

    @Test
    void updateRequiredChange_allowsOwnersToToggleCompletionButNotEditLabel() {
        AppUser owner = user(14L, "USER");
        FlowchartRequiredChange item = requiredChange(31L, flowchart(7L, owner), owner, "Add math elective", false);
        when(flowchartRequiredChangeRepository.findById(31L)).thenReturn(Optional.of(item));
        when(flowchartRequiredChangeRepository.save(any(FlowchartRequiredChange.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowchartRequiredChange updated = flowchartCommentService.updateRequiredChange(owner, 31L, null, true);

        assertThat(updated.isCompleted()).isTrue();
        assertThat(updated.getLabel()).isEqualTo("Add math elective");

        assertThatThrownBy(() -> flowchartCommentService.updateRequiredChange(owner, 31L, "Rewrite checklist text", true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only advisors/faculty/admin can edit checklist text.");
    }

    @Test
    void setDismissed_allowsOwnerButRejectsAdvisors() {
        AppUser owner = user(14L, "USER");
        AppUser advisor = user(77L, "ADVISOR");
        FlowchartComment comment = new FlowchartComment();
        comment.setId(11L);
        comment.setFlowchart(flowchart(7L, owner));
        when(flowchartCommentRepository.findById(11L)).thenReturn(Optional.of(comment));
        when(flowchartCommentRepository.save(any(FlowchartComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowchartComment dismissed = flowchartCommentService.setDismissed(owner, 11L, true);
        assertThat(dismissed.isDismissed()).isTrue();

        assertThatThrownBy(() -> flowchartCommentService.setDismissed(advisor, 11L, true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only the student owner can dismiss this comment.");
    }

    private AppUser user(long id, String role) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("user" + id + "@example.edu");
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setRole(role);
        return user;
    }

    private Flowchart flowchart(long id, AppUser owner) {
        Flowchart flowchart = new Flowchart();
        flowchart.setId(id);
        flowchart.setUser(owner);
        return flowchart;
    }

    private FlowchartRequiredChange requiredChange(long id, Flowchart flowchart, AppUser author, String label, boolean completed) {
        FlowchartRequiredChange item = new FlowchartRequiredChange();
        item.setId(id);
        item.setFlowchart(flowchart);
        item.setAuthor(author);
        item.setLabel(label);
        item.setCompleted(completed);
        return item;
    }
}

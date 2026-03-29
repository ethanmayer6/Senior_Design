package com.sdmay19.courseflow.flowchart;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdmay19.courseflow.TestSecurityConfig;
import com.sdmay19.courseflow.User.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = FlowchartController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class FlowchartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FlowchartService flowchartService;

    @MockBean
    private FlowchartCommentService flowchartCommentService;

    @Test
    void getFlowchartByUserId_forbidsStudentsFromViewingOtherStudents() throws Exception {
        AppUser requester = buildUser(14L, "USER");

        mockMvc.perform(get("/api/flowchart/user/{userId}", 99L).principal(authFor(requester)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getFlowchartComments_returnsMappedCommentResponses() throws Exception {
        AppUser requester = buildUser(14L, "USER");
        when(flowchartCommentService.listComments(requester, 7L)).thenReturn(List.of(buildComment(31L, "Looks good")));

        mockMvc.perform(get("/api/flowchart/{flowchartId}/comments", 7L).principal(authFor(requester)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(31))
                .andExpect(jsonPath("$[0].authorName").value("Ada Lovelace"))
                .andExpect(jsonPath("$[0].body").value("Looks good"));
    }

    @Test
    void createFlowchartComment_returnsCreatedResponse() throws Exception {
        AppUser requester = buildUser(14L, "USER");
        when(flowchartCommentService.createComment(requester, 7L, null, "Need advisor feedback", 120.5, 240.25))
                .thenReturn(buildComment(32L, "Need advisor feedback"));

        mockMvc.perform(post("/api/flowchart/{flowchartId}/comments", 7L)
                        .principal(authFor(requester))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Need advisor feedback",
                                "noteX", 120.5,
                                "noteY", 240.25
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(32))
                .andExpect(jsonPath("$.body").value("Need advisor feedback"));
    }

    @Test
    void reviewEndpoints_delegateToReviewService() throws Exception {
        AppUser advisor = buildUser(77L, "ADVISOR");
        FlowchartCommentService.FlowchartReviewResponse review = new FlowchartCommentService.FlowchartReviewResponse(
                7L,
                FlowchartReviewStatus.APPROVED,
                "Approved for next semester.",
                77L,
                LocalDateTime.of(2026, 3, 26, 12, 0));
        when(flowchartCommentService.getReview(advisor, 7L)).thenReturn(review);
        when(flowchartCommentService.updateReview(advisor, 7L, FlowchartReviewStatus.APPROVED, "Approved for next semester."))
                .thenReturn(review);

        mockMvc.perform(get("/api/flowchart/{flowchartId}/review", 7L).principal(authFor(advisor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewNotes").value("Approved for next semester."));

        mockMvc.perform(put("/api/flowchart/{flowchartId}/review", 7L)
                        .principal(authFor(advisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "status", "APPROVED",
                                "reviewNotes", "Approved for next semester."
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewedByUserId").value(77));
    }

    @Test
    void requiredChangeEndpoints_returnMappedChecklistItems() throws Exception {
        AppUser advisor = buildUser(77L, "ADVISOR");
        when(flowchartCommentService.listRequiredChanges(advisor, 7L)).thenReturn(List.of(buildRequiredChange(41L, "Add math elective", false)));
        when(flowchartCommentService.updateRequiredChange(advisor, 41L, null, true))
                .thenReturn(buildRequiredChange(41L, "Add math elective", true));

        mockMvc.perform(get("/api/flowchart/{flowchartId}/required-changes", 7L).principal(authFor(advisor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Add math elective"))
                .andExpect(jsonPath("$[0].completed").value(false));

        mockMvc.perform(patch("/api/flowchart/required-changes/{itemId}", 41L)
                        .principal(authFor(advisor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("completed", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        verify(flowchartCommentService).updateRequiredChange(advisor, 41L, null, true);
    }

    @Test
    void dismissFlowchartComment_defaultsDismissedToTrue() throws Exception {
        AppUser requester = buildUser(14L, "USER");
        when(flowchartCommentService.setDismissed(requester, 31L, true)).thenReturn(buildComment(31L, "Resolved"));

        mockMvc.perform(patch("/api/flowchart/comments/{commentId}/dismiss", 31L)
                        .principal(authFor(requester))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dismissed").value(false));

        verify(flowchartCommentService).setDismissed(requester, 31L, true);
    }

    private AppUser buildUser(long id, String role) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("user" + id + "@example.edu");
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setRole(role);
        return user;
    }

    private FlowchartComment buildComment(long id, String body) {
        Flowchart flowchart = new Flowchart();
        flowchart.setId(7L);

        FlowchartComment comment = new FlowchartComment();
        comment.setId(id);
        comment.setFlowchart(flowchart);
        comment.setAuthor(buildUser(14L, "USER"));
        comment.setBody(body);
        comment.setDismissed(false);
        comment.setCreatedAt(LocalDateTime.of(2026, 3, 26, 12, 0));
        comment.setUpdatedAt(LocalDateTime.of(2026, 3, 26, 12, 5));
        return comment;
    }

    private FlowchartRequiredChange buildRequiredChange(long id, String label, boolean completed) {
        Flowchart flowchart = new Flowchart();
        flowchart.setId(7L);

        FlowchartRequiredChange item = new FlowchartRequiredChange();
        item.setId(id);
        item.setFlowchart(flowchart);
        item.setAuthor(buildUser(77L, "ADVISOR"));
        item.setLabel(label);
        item.setCompleted(completed);
        item.setCreatedAt(LocalDateTime.of(2026, 3, 26, 12, 0));
        item.setUpdatedAt(LocalDateTime.of(2026, 3, 26, 12, 10));
        return item;
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

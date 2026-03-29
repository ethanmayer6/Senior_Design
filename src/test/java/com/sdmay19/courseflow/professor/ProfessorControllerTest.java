package com.sdmay19.courseflow.professor;

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

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ProfessorController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class ProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProfessorService professorService;

    @Test
    void browseProfessors_forwardsBrowseFilters() throws Exception {
        ProfessorSummaryResponse professor = new ProfessorSummaryResponse(8L, "Dr. Ada", "Professor", "SE", "ada@isu.edu", null, 4.8, 12);
        when(professorService.browseProfessors("ada", "SE", 2, 20, "rating"))
                .thenReturn(new ProfessorBrowseResponse(List.of(professor), 2, 20, 1, 1, "rating"));

        mockMvc.perform(get("/api/professors")
                        .param("query", "ada")
                        .param("department", "SE")
                        .param("page", "2")
                        .param("size", "20")
                        .param("sort", "rating"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.professors[0].fullName").value("Dr. Ada"))
                .andExpect(jsonPath("$.sort").value("rating"));
    }

    @Test
    void getDirectoryMetadata_returnsStatusAndDepartments() throws Exception {
        when(professorService.getDirectoryStatus()).thenReturn(new ProfessorDirectoryStatusResponse(true, false, 240));
        when(professorService.getAllDepartments()).thenReturn(List.of("Computer Science", "Software Engineering"));

        mockMvc.perform(get("/api/professors/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.professorCount").value(240));

        mockMvc.perform(get("/api/professors/departments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Computer Science"))
                .andExpect(jsonPath("$[1]").value("Software Engineering"));
    }

    @Test
    void getProfessorDetail_passesAuthenticatedUser() throws Exception {
        AppUser user = buildUser(14L);
        ProfessorDetailResponse detail = new ProfessorDetailResponse(
                8L,
                "Dr. Ada",
                "Professor",
                "SE",
                "ada@isu.edu",
                "https://example.edu/ada",
                "Bio",
                4.6,
                10,
                Map.of(5, 8L, 4, 2L),
                null,
                true);
        when(professorService.getProfessorDetail(8L, user)).thenReturn(detail);

        mockMvc.perform(get("/api/professors/{professorId}", 8L).principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(8))
                .andExpect(jsonPath("$.fullName").value("Dr. Ada"))
                .andExpect(jsonPath("$.currentUserCanReview").value(true));
    }

    @Test
    void getMyReview_returnsNoContentWhenNoneExists() throws Exception {
        AppUser user = buildUser(14L);
        when(professorService.getMyProfessorReview(8L, user)).thenReturn(null);

        mockMvc.perform(get("/api/professors/{professorId}/reviews/me", 8L).principal(authFor(user)))
                .andExpect(status().isNoContent());
    }

    @Test
    void reviewCrudEndpoints_delegateToService() throws Exception {
        AppUser user = buildUser(14L);
        ProfessorReviewResponse review = buildReviewResponse(33L);
        when(professorService.createProfessorReview(eq(8L), any(ProfessorReviewRequest.class), eq(user))).thenReturn(review);
        when(professorService.updateMyProfessorReview(eq(8L), any(ProfessorReviewRequest.class), eq(user))).thenReturn(review);

        mockMvc.perform(post("/api/professors/{professorId}/reviews", 8L)
                        .principal(authFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 5,
                                "classTaken", "SE 3190",
                                "anonymous", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(33))
                .andExpect(jsonPath("$.classTaken").value("SE 3190"));

        mockMvc.perform(put("/api/professors/{professorId}/reviews/me", 8L)
                        .principal(authFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 4,
                                "wouldTakeAgain", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(5));

        mockMvc.perform(delete("/api/professors/{professorId}/reviews/me", 8L).principal(authFor(user)))
                .andExpect(status().isNoContent());

        verify(professorService).deleteMyProfessorReview(8L, user);
    }

    @Test
    void getProfessorReviews_returnsPagedPayload() throws Exception {
        AppUser user = buildUser(14L);
        when(professorService.getProfessorReviews(8L, user, 0, 10))
                .thenReturn(new ProfessorReviewPageResponse(List.of(buildReviewResponse(33L)), 0, 10, 1, 1));

        mockMvc.perform(get("/api/professors/{professorId}/reviews", 8L)
                        .param("page", "0")
                        .param("size", "10")
                        .principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews[0].id").value(33))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    private AppUser buildUser(long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("student@example.edu");
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setRole("USER");
        return user;
    }

    private ProfessorReviewResponse buildReviewResponse(long id) {
        Instant now = Instant.parse("2026-03-26T12:00:00Z");
        return new ProfessorReviewResponse(
                id,
                5,
                3,
                2,
                true,
                "SE 3190",
                "Fall 2025",
                "A",
                "Helpful office hours",
                "Fast pacing",
                "More worked examples",
                "Read before class",
                true,
                null,
                "Anonymous",
                now,
                now,
                true);
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

package com.sdmay19.courseflow.course;

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
        controllers = CourseReviewController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class CourseReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CourseReviewService courseReviewService;

    @Test
    void getCourseReviews_passesAuthenticatedUserAndPaging() throws Exception {
        AppUser user = buildUser(14L);
        CourseReviewResponse review = buildReviewResponse(51L, "Ada");
        when(courseReviewService.getCourseReviews(7L, user, 1, 5))
                .thenReturn(new CourseReviewPageResponse(List.of(review), 1, 5, 1, 1));

        mockMvc.perform(get("/api/courses/{courseId}/reviews", 7L)
                        .param("page", "1")
                        .param("size", "5")
                        .principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.reviews[0].id").value(51))
                .andExpect(jsonPath("$.reviews[0].reviewerDisplayName").value("Ada"));
    }

    @Test
    void getCourseReviewSummary_supportsAnonymousViewer() throws Exception {
        CourseReviewSummaryResponse summary = new CourseReviewSummaryResponse(4.5, 2, Map.of(5, 1L, 4, 1L), null, false);
        when(courseReviewService.getCourseReviewSummary(7L, null)).thenReturn(summary);

        mockMvc.perform(get("/api/courses/{courseId}/reviews/summary", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(4.5))
                .andExpect(jsonPath("$.reviewCount").value(2))
                .andExpect(jsonPath("$.currentUserCanReview").value(false));
    }

    @Test
    void getMyReview_returnsNoContentWhenUserHasNotReviewed() throws Exception {
        AppUser user = buildUser(14L);
        when(courseReviewService.getMyCourseReview(7L, user)).thenReturn(null);

        mockMvc.perform(get("/api/courses/{courseId}/reviews/me", 7L).principal(authFor(user)))
                .andExpect(status().isNoContent());
    }

    @Test
    void createReview_delegatesToService() throws Exception {
        AppUser user = buildUser(14L);
        when(courseReviewService.createCourseReview(eq(7L), any(CourseReviewRequest.class), eq(user)))
                .thenReturn(buildReviewResponse(61L, "Ada"));

        mockMvc.perform(post("/api/courses/{courseId}/reviews", 7L)
                        .principal(authFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 5,
                                "difficultyRating", 3,
                                "anonymous", true,
                                "positives", "Clear lectures"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(61))
                .andExpect(jsonPath("$.anonymous").value(true));

        verify(courseReviewService).createCourseReview(eq(7L), any(CourseReviewRequest.class), eq(user));
    }

    @Test
    void updateMyReview_delegatesToService() throws Exception {
        AppUser user = buildUser(14L);
        when(courseReviewService.updateMyCourseReview(eq(7L), any(CourseReviewRequest.class), eq(user)))
                .thenReturn(buildReviewResponse(61L, "Ada"));

        mockMvc.perform(put("/api/courses/{courseId}/reviews/me", 7L)
                        .principal(authFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 4,
                                "wouldTakeAgain", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4));
    }

    @Test
    void deleteMyReview_returnsNoContent() throws Exception {
        AppUser user = buildUser(14L);

        mockMvc.perform(delete("/api/courses/{courseId}/reviews/me", 7L).principal(authFor(user)))
                .andExpect(status().isNoContent());

        verify(courseReviewService).deleteMyCourseReview(7L, user);
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

    private CourseReviewResponse buildReviewResponse(long id, String displayName) {
        Instant now = Instant.parse("2026-03-26T12:00:00Z");
        return new CourseReviewResponse(
                id,
                4,
                3,
                2,
                true,
                "Fall 2025",
                "Dr. Rivera",
                "A",
                "Great projects",
                "Heavy reading",
                "More examples",
                "Start early",
                true,
                null,
                displayName,
                now,
                now,
                true);
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

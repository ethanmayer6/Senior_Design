package com.sdmay19.courseflow.games;

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
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = GamesController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class GamesControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GamesService gamesService;

    @Test
    void getDailyPuzzle_returnsStateForAuthenticatedUser() throws Exception {
        AppUser currentUser = buildUser(44L);
        DailyGameStateResponse response = sampleState(false);
        when(gamesService.getDailyGame(any(AppUser.class))).thenReturn(response);

        mockMvc.perform(get("/api/games/daily").principal(authFor(currentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wordLength").value(4))
                .andExpect(jsonPath("$.scrambledWord").value("OLCG"))
                .andExpect(jsonPath("$.solved").value(false));

        verify(gamesService).getDailyGame(currentUser);
    }

    @Test
    void submitDailyGuess_returnsGuessResult() throws Exception {
        AppUser currentUser = buildUser(44L);
        DailyGameGuessResponse response = new DailyGameGuessResponse(true, "Nice work", sampleState(true));
        when(gamesService.submitDailyGuess(any(AppUser.class), any(DailyGameGuessRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/games/daily/guess")
                        .principal(authFor(currentUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DailyGameGuessRequest("logic"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.message").value("Nice work"))
                .andExpect(jsonPath("$.state.solved").value(true));

        verify(gamesService).submitDailyGuess(any(AppUser.class), any(DailyGameGuessRequest.class));
    }

    private DailyGameStateResponse sampleState(boolean solved) {
        return new DailyGameStateResponse(
                LocalDate.of(2026, 3, 26),
                "OLCG",
                "Reasoning-heavy class",
                4,
                solved,
                solved ? 42_000L : null,
                solved ? 1 : null,
                solved ? 3L : 0L,
                1_743_001_200_000L,
                solved ? 0 : 1,
                List.of(new GameLeaderboardEntry(44L, "student@example.edu", "Ada", "Lovelace", 42_000L, Instant.parse("2026-03-26T12:00:00Z"))),
                List.of()
        );
    }

    private AppUser buildUser(long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("student@example.edu");
        user.setRole("USER");
        return user;
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

package com.sdmay19.courseflow.User;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdmay19.courseflow.TestSecurityConfig;
import com.sdmay19.courseflow.security.AuthResponse;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = UserController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Test
    void loginUser_returnsAuthPayload() throws Exception {
        AppUser user = buildUser(14L);
        when(userService.login("student@example.edu", "secret1"))
                .thenReturn(new AuthResponse("jwt-token", user));

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "student@example.edu",
                                "password", "secret1"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.user.id").value(14))
                .andExpect(jsonPath("$.user.email").value("student@example.edu"));
    }

    @Test
    void registerUser_returnsCreatedUser() throws Exception {
        AppUser saved = buildUser(22L);
        when(userService.register(any(AppUser.class))).thenReturn(saved);

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "firstName", "Ada",
                                "lastName", "Lovelace",
                                "email", "student@example.edu",
                                "password", "secret1",
                                "phone", "515-555-1212",
                                "major", "Software Engineering",
                                "role", "USER"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(22))
                .andExpect(jsonPath("$.email").value("student@example.edu"));
    }

    @Test
    void uploadProfilePicture_delegatesToService() throws Exception {
        doReturn(org.springframework.http.ResponseEntity.ok(Map.of("profilePictureUrl", "/uploads/pic.png")))
                .when(userService)
                .uploadProfilePicture(eq(14L), any());

        mockMvc.perform(multipart("/api/users/{id}/profile-picture", 14L)
                        .file("file", "fake-image".getBytes()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePictureUrl").value("/uploads/pic.png"));
    }

    @Test
    void checkEmailAvailability_returnsAvailabilityFlag() throws Exception {
        when(userService.isEmailAvailable("student@example.edu")).thenReturn(true);

        mockMvc.perform(get("/api/users/check-email").param("email", "student@example.edu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void getMe_returnsAuthenticatedPrincipal() throws Exception {
        AppUser user = buildUser(14L);

        mockMvc.perform(get("/api/users/me").principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(14))
                .andExpect(jsonPath("$.email").value("student@example.edu"));
    }

    @Test
    void searchUsers_usesAuthenticatedUserId() throws Exception {
        AppUser currentUser = buildUser(14L);
        when(userService.searchUsersByUsername("ada", 14L))
                .thenReturn(List.of(new UserSearchResult(21L, "ada@example.edu", "Ada", "Lovelace", "SE", null)));

        mockMvc.perform(get("/api/users/search")
                        .param("username", "ada")
                        .principal(authFor(currentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(21))
                .andExpect(jsonPath("$[0].username").value("ada@example.edu"));

        verify(userService).searchUsersByUsername("ada", 14L);
    }

    @Test
    void getPreferences_returnsPreferencePayload() throws Exception {
        AppUser currentUser = buildUser(14L);
        when(userService.getPreferences(14L))
                .thenReturn(new UserPreferencesResponse(true, "ocean", "large", true));

        mockMvc.perform(get("/api/users/preferences").principal(authFor(currentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.darkMode").value(true))
                .andExpect(jsonPath("$.themePreset").value("ocean"))
                .andExpect(jsonPath("$.fontScale").value("large"))
                .andExpect(jsonPath("$.reducedMotion").value(true));
    }

    @Test
    void updatePreferences_forwardsBodyAndReturnsUpdatedPreferences() throws Exception {
        AppUser currentUser = buildUser(14L);
        UserPreferencesResponse response = new UserPreferencesResponse(true, "forest", "small", false);
        when(userService.updatePreferences(eq(14L), any(UserPreferencesUpdateRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/users/preferences")
                        .principal(authFor(currentUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "darkMode", true,
                                "themePreset", "forest",
                                "fontScale", "small",
                                "reducedMotion", false
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themePreset").value("forest"))
                .andExpect(jsonPath("$.fontScale").value("small"));
    }

    @Test
    void addFriend_returnsNoContent() throws Exception {
        AppUser currentUser = buildUser(14L);

        mockMvc.perform(post("/api/users/friends/{friendId}", 33L)
                        .principal(authFor(currentUser)))
                .andExpect(status().isNoContent());

        verify(userService).addFriend(14L, 33L);
    }

    @Test
    void delete_removesAuthenticatedUser() throws Exception {
        AppUser currentUser = buildUser(14L);

        mockMvc.perform(delete("/api/users/delete").principal(authFor(currentUser)))
                .andExpect(status().isNoContent());

        verify(userService).deleteById(14L);
    }

    private AppUser buildUser(long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("student@example.edu");
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setRole("USER");
        user.setMajor("Software Engineering");
        return user;
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

package com.sdmay19.courseflow.security;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void protectedUserEndpoint_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedUserEndpoint_acceptsValidJwtAndHydratesPrincipal() throws Exception {
        AppUser user = saveUser("student@example.edu", "USER");
        String token = jwtService.generateToken(user.getId());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.email").value("student@example.edu"));
    }

    @Test
    void adminEndpoint_rejectsNonAdminJwt() throws Exception {
        AppUser user = saveUser("student@example.edu", "USER");
        String token = jwtService.generateToken(user.getId());

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_allowsAdminJwtThroughRealSecurityChain() throws Exception {
        AppUser admin = saveUser("admin@example.edu", "ADMIN");
        String token = jwtService.generateToken(admin.getId());

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("admin@example.edu"));
    }

    private AppUser saveUser(String email, String role) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("secret1"));
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setMajor("Software Engineering");
        user.setPhone("515-555-1212");
        user.setRole(role);
        user.setDarkMode(false);
        user.setThemePreset("default");
        user.setFontScale("medium");
        user.setReducedMotion(false);
        return userRepository.save(user);
    }
}

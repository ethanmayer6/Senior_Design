package com.sdmay19.courseflow.User;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdmay19.courseflow.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AdminController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Test
    void getAllUsers_returnsAllUsers() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of(buildUser(7L, "USER"), buildUser(9L, "ADMIN")));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[1].role").value("ADMIN"));
    }

    @Test
    void getUser_returnsRequestedUser() throws Exception {
        when(userService.getUserById(7L)).thenReturn(buildUser(7L, "USER"));

        mockMvc.perform(get("/api/admin/user/{id}", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.email").value("user7@example.edu"));
    }

    @Test
    void updateUser_delegatesToServiceAndReturnsReloadedUser() throws Exception {
        AppUser updated = buildUser(7L, "USER");
        updated.setFirstName("Grace");
        when(userService.getUserById(7L)).thenReturn(updated);

        mockMvc.perform(put("/api/admin/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", 7,
                                "firstName", "Grace",
                                "phone", "515-555-0007"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.firstName").value("Grace"));

        verify(userService).updateUser(eq(7L), any(UserUpdator.class));
        verify(userService).getUserById(7L);
    }

    @Test
    void setRole_updatesRoleAndReturnsUser() throws Exception {
        when(userService.getUserById(7L)).thenReturn(buildUser(7L, "FACULTY"));

        mockMvc.perform(put("/api/admin/setRole")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "id", 7,
                                "role", "FACULTY"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("FACULTY"));

        verify(userService).setRole(7L, "FACULTY");
    }

    @Test
    void deleteUser_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/admin/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("id", 7))))
                .andExpect(status().isNoContent());

        verify(userService).deleteById(7L);
    }

    private AppUser buildUser(long id, String role) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("user" + id + "@example.edu");
        user.setFirstName("Ada");
        user.setLastName("Lovelace");
        user.setMajor("Software Engineering");
        user.setRole(role);
        return user;
    }
}

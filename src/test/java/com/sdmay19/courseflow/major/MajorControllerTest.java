package com.sdmay19.courseflow.major;

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
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = MajorController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class MajorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MajorService majorService;

    @Test
    void createMajor_returnsCreatedMajor() throws Exception {
        when(majorService.createMajor(any(MajorDTO.class))).thenReturn(major(7L, "Software Engineering"));

        mockMvc.perform(post("/api/majors/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MajorDTO("Software Engineering", College.ENGINEERING, "Desc", List.of("Core")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.name").value("Software Engineering"));
    }

    @Test
    void getMajorSummariesPage_returnsPagedSummaries() throws Exception {
        when(majorService.getMajorSummariesPage(1, 20, "soft"))
                .thenReturn(new PageImpl<>(List.of(new MajorSummaryDTO(7L, "Software Engineering", College.ENGINEERING))));

        mockMvc.perform(get("/api/majors/summaries/page")
                        .param("page", "1")
                        .param("size", "20")
                        .param("query", "soft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Software Engineering"));
    }

    @Test
    void updateMajor_returnsUpdatedMajor() throws Exception {
        when(majorService.updateMajor(org.mockito.Mockito.eq(7L), any(MajorDTO.class))).thenReturn(major(7L, "Computer Engineering"));

        mockMvc.perform(put("/api/majors/update/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MajorDTO("Computer Engineering", College.ENGINEERING, "Updated", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Computer Engineering"));
    }

    @Test
    void readAndDeleteEndpoints_delegateToService() throws Exception {
        when(majorService.getAllMajorNames()).thenReturn(List.of("Software Engineering", "Computer Science"));
        when(majorService.getMajorByName("Software Engineering")).thenReturn(major(7L, "Software Engineering"));

        mockMvc.perform(get("/api/majors/names"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Software Engineering"));

        mockMvc.perform(get("/api/majors/name/{name}", "Software Engineering"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));

        mockMvc.perform(delete("/api/majors/delete/{id}", 7L))
                .andExpect(status().isNoContent());

        verify(majorService).deleteById(7L);
    }

    private Major major(long id, String name) {
        Major major = new Major();
        major.setId(id);
        major.setName(name);
        major.setCollege(College.ENGINEERING);
        major.setDescription("Desc");
        return major;
    }
}

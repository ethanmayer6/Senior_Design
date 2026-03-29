package com.sdmay19.courseflow.degree_requirement;

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
        controllers = DegreeRequirementController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class DegreeRequirementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DegreeRequirementService degreeRequirementService;

    @Test
    void createDegreeRequirement_returnsCreatedEntity() throws Exception {
        when(degreeRequirementService.creatFromDTO(any(DegreeRequirementDTO.class))).thenReturn(requirement(7L, "Math and Science Core"));

        mockMvc.perform(post("/api/degreerequirement/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DegreeRequirementDTO("Math and Science Core", List.of("MATH_1650"), List.of("Math Core"), 12))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Math and Science Core"));
    }

    @Test
    void readAndUpdateEndpoints_returnRequirementPayloads() throws Exception {
        when(degreeRequirementService.getById(7L)).thenReturn(requirement(7L, "Math and Science Core"));
        when(degreeRequirementService.getAll()).thenReturn(List.of(requirement(7L, "Math and Science Core")));
        when(degreeRequirementService.update(org.mockito.Mockito.eq(7L), any(DegreeRequirementDTO.class)))
                .thenReturn(requirement(7L, "Updated Requirement"));

        mockMvc.perform(get("/api/degreerequirement/id/{id}", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));

        mockMvc.perform(get("/api/degreerequirement/getall"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Math and Science Core"));

        mockMvc.perform(put("/api/degreerequirement/update/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DegreeRequirementDTO("Updated Requirement", List.of(), List.of(), 9))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Requirement"));
    }

    @Test
    void deleteDegreeRequirement_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/degreerequirement/delete/{id}", 7L))
                .andExpect(status().isNoContent());

        verify(degreeRequirementService).deleteById(7L);
    }

    private DegreeRequirement requirement(long id, String name) {
        DegreeRequirement requirement = new DegreeRequirement();
        requirement.setId(id);
        requirement.setName(name);
        requirement.setSatisfyingCredits(12);
        return requirement;
    }
}

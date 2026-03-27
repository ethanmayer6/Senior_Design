package com.sdmay19.courseflow.requirement_group;

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
        controllers = RequirementGroupController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class RequirementGroupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RequirementGroupService requirementGroupService;

    @Test
    void createRequirementGroup_returnsCreatedGroup() throws Exception {
        when(requirementGroupService.createFromDTO(any(RequirementGroupDTO.class))).thenReturn(group(7L, "Math Core"));

        mockMvc.perform(post("/api/requirementgroup/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequirementGroupDTO("Math Core", 9, List.of("MATH_1650")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Math Core"));
    }

    @Test
    void linkCourses_returnsUpdatedGroup() throws Exception {
        when(requirementGroupService.linkCoursesToExistingGroup(7L, List.of("COMS_2270", "COMS_2280")))
                .thenReturn(group(7L, "Programming Core"));

        mockMvc.perform(post("/api/requirementgroup/{groupId}/linkcourses", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of("COMS_2270", "COMS_2280"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void readUpdateAndDeleteEndpoints_delegateToService() throws Exception {
        when(requirementGroupService.getAll()).thenReturn(List.of(group(7L, "Math Core")));
        when(requirementGroupService.updateRequirementGroup(org.mockito.Mockito.eq(7L), any(RequirementGroupDTO.class)))
                .thenReturn(group(7L, "Updated Core"));

        mockMvc.perform(get("/api/requirementgroup/getall"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Math Core"));

        mockMvc.perform(put("/api/requirementgroup/update/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequirementGroupDTO("Updated Core", 12, List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Core"));

        mockMvc.perform(delete("/api/requirementgroup/delete/{id}", 7L))
                .andExpect(status().isNoContent());

        verify(requirementGroupService).deleteById(7L);
    }

    private RequirementGroup group(long id, String name) {
        RequirementGroup group = new RequirementGroup();
        group.setId(id);
        group.setName(name);
        group.setSatisfyingCredits(9);
        return group;
    }
}

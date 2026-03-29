package com.sdmay19.courseflow.professor;

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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AdminProfessorController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class AdminProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProfessorService professorService;

    @Test
    void importFromPayload_returnsServiceResponse() throws Exception {
        ProfessorImportDataset dataset = new ProfessorImportDataset(
                "manual",
                "2026-03-26T12:00:00Z",
                List.of(new ProfessorImportRecord("Dr. Ada", "Professor", "SE", "ada@isu.edu", null, null, "scraper", "ada")));
        when(professorService.importFromDataset(any(ProfessorImportDataset.class), eq(false)))
                .thenReturn(new ProfessorImportResponse(1, 0, 0, 0));

        mockMvc.perform(post("/api/admin/professors/import")
                        .param("overwrite", "false")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dataset)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1))
                .andExpect(jsonPath("$.updated").value(0));

        verify(professorService).importFromDataset(any(ProfessorImportDataset.class), eq(false));
    }

    @Test
    void importFromFile_returnsServiceResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "professors.json",
                "application/json",
                "{\"source\":\"manual\",\"professors\":[]}".getBytes());
        when(professorService.importFromJsonFile(any(), eq(true)))
                .thenReturn(new ProfessorImportResponse(0, 2, 0, 0));

        mockMvc.perform(multipart("/api/admin/professors/import/file")
                        .file(file)
                        .param("overwrite", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(2));
    }
}

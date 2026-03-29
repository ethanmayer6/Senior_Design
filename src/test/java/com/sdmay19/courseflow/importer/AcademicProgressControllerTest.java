package com.sdmay19.courseflow.importer;

import com.sdmay19.courseflow.TestSecurityConfig;
import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.Flowchart;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AcademicProgressController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class AcademicProgressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AcademicProgressService academicProgressService;

    @Test
    void uploadAcademicProgress_rejectsEmptyFiles() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "progress.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[0]);

        mockMvc.perform(multipart("/api/progressReport/upload").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("No file uploaded."));
    }

    @Test
    void uploadAcademicProgress_returnsParsedSummary() throws Exception {
        MockMultipartFile file = sampleSpreadsheet();
        AcademicProgressService.StudentProgressResult result = new AcademicProgressService.StudentProgressResult(
                List.of(new AcademicProgressService.MappedCourse("COMS_2270", "Object-Oriented Programming", "FALL2024", 4)),
                List.of(new AcademicProgressService.MappedCourse("ENGL_1500", "Critical Thinking", null, 3)),
                List.of("MATH_1650"),
                120,
                93,
                6,
                List.of(new AcademicProgressParser.ParsedRequirement("Math Core", "IN_PROGRESS", 3)));
        when(academicProgressService.processProgress(any())).thenReturn(result);

        mockMvc.perform(multipart("/api/progressReport/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isuCourses[0].courseCode").value("COMS_2270"))
                .andExpect(jsonPath("$.transferCourses[0].courseCode").value("ENGL_1500"))
                .andExpect(jsonPath("$.unmatchedCourses[0]").value("MATH_1650"))
                .andExpect(jsonPath("$.creditsDefined").value(120));
    }

    @Test
    void uploadAcademicProgress_returnsInternalServerErrorWhenServiceFails() throws Exception {
        when(academicProgressService.processProgress(any())).thenThrow(new RuntimeException("parse exploded"));

        mockMvc.perform(multipart("/api/progressReport/upload").file(sampleSpreadsheet()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$").value("Failed to process academic progress: parse exploded"));
    }

    @Test
    void generateFlowchart_requiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/api/progressReport/flowchart").file(sampleSpreadsheet()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$").value("Authentication required."));
    }

    @Test
    void generateFlowchart_buildsProjectionAndPersistsFlowchart() throws Exception {
        AppUser user = buildUser(14L);
        Course course = new Course();
        course.setId(7L);
        course.setCourseIdent("COMS_2270");
        course.setName("Object-Oriented Programming");

        AcademicProgressService.FlowchartResult graph = new AcademicProgressService.FlowchartResult(
                List.of(course),
                List.<String[]>of(new String[] { "MATH_1650", "COMS_2270" }),
                List.of("COMS_2270"),
                Map.of("COMS_2270", "FALL2024"));
        when(academicProgressService.buildFlowchartFromProgress(any())).thenReturn(graph);
        when(academicProgressService.createFlowchartFromProgress(any(), eq(user))).thenReturn(new Flowchart());

        mockMvc.perform(multipart("/api/progressReport/flowchart")
                        .file(sampleSpreadsheet())
                        .principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courses[0].courseIdent").value("COMS_2270"))
                .andExpect(jsonPath("$.completedCourses[0]").value("COMS_2270"))
                .andExpect(jsonPath("$.academicPeriods.COMS_2270").value("FALL2024"));

        verify(academicProgressService).buildFlowchartFromProgress(any());
        verify(academicProgressService).createFlowchartFromProgress(any(), eq(user));
    }

    @Test
    void generateFlowchart_translatesIllegalArgumentException() throws Exception {
        AppUser user = buildUser(14L);
        when(academicProgressService.buildFlowchartFromProgress(any()))
                .thenThrow(new IllegalArgumentException("No courses were parsed."));

        mockMvc.perform(multipart("/api/progressReport/flowchart")
                        .file(sampleSpreadsheet())
                        .principal(authFor(user)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("No courses were parsed."));
    }

    private MockMultipartFile sampleSpreadsheet() {
        return new MockMultipartFile(
                "file",
                "progress.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fake-bytes".getBytes());
    }

    private AppUser buildUser(long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail("student@example.edu");
        user.setRole("USER");
        user.setMajor("Software Engineering");
        return user;
    }

    private Authentication authFor(AppUser user) {
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}

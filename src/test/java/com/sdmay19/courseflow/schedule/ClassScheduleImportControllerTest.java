package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.TestSecurityConfig;
import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.semester.Term;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ClassScheduleImportController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class ClassScheduleImportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClassScheduleImportService importService;

    @Test
    void importSchedule_requiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/api/class-schedule/import").file(sampleFile()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$").value("Authentication required."));
    }

    @Test
    void importSchedule_returnsServiceResult() throws Exception {
        AppUser user = buildUser(14L);
        when(importService.importSchedule(any(), eq(user)))
                .thenReturn(new ClassScheduleImportService.ImportResult(2, 2, 1, 1, 1, "Imported schedule data and synced current-term courses."));

        mockMvc.perform(multipart("/api/class-schedule/import")
                        .file(sampleFile())
                        .principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parsedRows").value(2))
                .andExpect(jsonPath("$.distinctCoursesSynced").value(1));
    }

    @Test
    void importSchedule_translatesIllegalArgumentException() throws Exception {
        AppUser user = buildUser(14L);
        when(importService.importSchedule(any(), eq(user))).thenThrow(new IllegalArgumentException("No schedule rows were found."));

        mockMvc.perform(multipart("/api/class-schedule/import")
                        .file(sampleFile())
                        .principal(authFor(user)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("No schedule rows were found."));
    }

    @Test
    void getCurrent_returnsMappedEntries() throws Exception {
        AppUser user = buildUser(14L);
        when(importService.getCurrentTermEntries(user)).thenReturn(List.of(buildEntry(1L, "COMS_2270")));

        mockMvc.perform(get("/api/class-schedule/current").principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseIdent").value("COMS_2270"))
                .andExpect(jsonPath("$[0].term").value("SPRING"))
                .andExpect(jsonPath("$[0].catalogName").value("Object-Oriented Programming"));
    }

    @Test
    void getByTerm_rejectsInvalidTermValues() throws Exception {
        AppUser user = buildUser(14L);

        mockMvc.perform(get("/api/class-schedule/term")
                        .param("year", "2026")
                        .param("term", "AUTUMN")
                        .principal(authFor(user)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Invalid term. Use SPRING, SUMMER, FALL, or WINTER."));
    }

    @Test
    void getByTerm_returnsMappedEntries() throws Exception {
        AppUser user = buildUser(14L);
        when(importService.getTermEntries(user, 2026, Term.SPRING)).thenReturn(List.of(buildEntry(2L, "SE_3190")));

                mockMvc.perform(get("/api/class-schedule/term")
                        .param("year", "2026")
                        .param("term", "spring")
                        .principal(authFor(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseIdent").value("SE_3190"))
                .andExpect(jsonPath("$[0].meetingStartTime").value("09:00"));

        verify(importService).getTermEntries(user, 2026, Term.SPRING);
    }

    private MockMultipartFile sampleFile() {
        return new MockMultipartFile(
                "file",
                "schedule.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fake".getBytes());
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

    private ClassScheduleEntry buildEntry(long id, String ident) {
        Course course = new Course();
        course.setCourseIdent(ident);
        course.setName("Object-Oriented Programming");
        course.setCredits(4);

        ClassScheduleEntry entry = new ClassScheduleEntry();
        entry.setId(id);
        entry.setCourse(course);
        entry.setCourseIdent(ident);
        entry.setSectionCode(ident + "-A");
        entry.setCourseTitle("Catalog Title");
        entry.setAcademicPeriodLabel("2026 Spring Semester");
        entry.setYear(2026);
        entry.setTerm(Term.SPRING);
        entry.setTermStartDate(LocalDate.of(2026, 1, 12));
        entry.setTermEndDate(LocalDate.of(2026, 5, 8));
        entry.setMeetingPatternRaw("MWF | 9:00 AM - 9:50 AM");
        entry.setMeetingDays("MWF");
        entry.setMeetingStartTime(LocalTime.of(9, 0));
        entry.setMeetingEndTime(LocalTime.of(9, 50));
        entry.setFreeDropDeadline(LocalDate.of(2026, 1, 20));
        entry.setWithdrawDeadline(LocalDate.of(2026, 4, 1));
        entry.setInstructor("Dr. Ada");
        entry.setDeliveryMode("In Person");
        entry.setLocations("Durham 1212");
        entry.setInstructionalFormat("Lecture");
        return entry;
    }
}

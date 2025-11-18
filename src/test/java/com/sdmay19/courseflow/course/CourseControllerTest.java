package com.sdmay19.courseflow.course;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdmay19.courseflow.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = CourseController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class CourseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CourseService courseService;

    private Course buildSampleCourse(Long id, String ident) {
        Course c = new Course();
        c.setId(id);
        c.setName("Sample Course");
        c.setCourseIdent(ident);
        c.setCredits(3);
        c.setPrereq_txt("");
        c.setPrerequisites(new HashSet<>());
        c.setDescription("Desc");
        c.setHours("3");
        c.setOffered("Fall");
        return c;
    }

    // ------- CREATE --------

//    @Test
//    void create_returnsCreatedCourse_andStatus201() throws Exception {
//        Course toCreate = buildSampleCourse(null, "COMS_2280");
//        Course created = buildSampleCourse(1L, "COMS_2280");
//
//        when(courseService.create(any(Course.class))).thenReturn(created);
//
//        mockMvc.perform(post("/api/courses/create")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(toCreate)))
//                .andExpect(status().isCreated())
//                .andExpect(jsonPath("$.id", is(1)))
//                .andExpect(jsonPath("$.courseIdent", is("COMS_2280")));
//
//        verify(courseService).create(any(Course.class));
//    }

//    @Test
//    void bulkCreate_returnsCreatedCourses_andStatus201() throws Exception {
//        Course c1 = buildSampleCourse(null, "COMS_2280");
//        Course c2 = buildSampleCourse(null, "COMS_3110");
//        List<Course> requestList = List.of(c1, c2);
//
//        Course saved1 = buildSampleCourse(1L, "COMS_2280");
//        Course saved2 = buildSampleCourse(2L, "COMS_3110");
//
//        when(courseService.createAll(anyList())).thenReturn(List.of(saved1, saved2));
//
//        mockMvc.perform(post("/api/courses/bulk-create")
//                        .contentType(MediaType.APPLICATION_JSON)
//                        .content(objectMapper.writeValueAsString(requestList)))
//                .andExpect(status().isCreated())
//                .andExpect(jsonPath("$", hasSize(2)))
//                .andExpect(jsonPath("$[0].id", is(1)))
//                .andExpect(jsonPath("$[1].id", is(2)));
//
//        verify(courseService).createAll(anyList());
//    }

    // ------- READ --------

    @Test
    void getById_returnsCourse() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.getById(1L)).thenReturn(c);

        mockMvc.perform(get("/api/courses/ident/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.courseIdent", is("COMS_2280")));

        verify(courseService).getById(1L);
    }

    @Test
    void getByCourseIdent_returnsCourse() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.getByCourseIdent("COMS_2280")).thenReturn(c);

        mockMvc.perform(get("/api/courses/courseIdent/{courseIdent}", "COMS_2280"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseIdent", is("COMS_2280")));

        verify(courseService).getByCourseIdent("COMS_2280");
    }

    @Test
    void getByName_returnsCourse() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.getByName("Sample Course")).thenReturn(c);

        mockMvc.perform(get("/api/courses/name/{name}", "Sample Course"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Sample Course")));

        verify(courseService).getByName("Sample Course");
    }

    @Test
    void getAll_returnsListOfCourses() throws Exception {
        Course c1 = buildSampleCourse(1L, "COMS_2280");
        Course c2 = buildSampleCourse(2L, "COMS_3110");
        when(courseService.getAllCourse()).thenReturn(List.of(c1, c2));

        mockMvc.perform(get("/api/courses/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[1].id", is(2)));

        verify(courseService).getAllCourse();
    }

    @Test
    void getPage_returnsPagedCourses() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.getPage(0, 50)).thenReturn(List.of(c));

        mockMvc.perform(get("/api/courses/page")
                        .param("page", "0")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(courseService).getPage(0, 50);
    }

    @Test
    void searchCourse_returnsMatchingCourses() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.searchCourse("COMS_2280")).thenReturn(List.of(c));

        mockMvc.perform(get("/api/courses/search")
                        .param("searchTerm", "COMS_2280"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].courseIdent", is("COMS_2280")));

        verify(courseService).searchCourse("COMS_2280");
    }

    @Test
    void filterCourse_returnsFilteredCourses() throws Exception {
        Course c = buildSampleCourse(1L, "COMS_2280");
        when(courseService.filterCourse("2000", "Fall", "COMS", 0, 50))
                .thenReturn(List.of(c));

        mockMvc.perform(get("/api/courses/filter")
                        .param("level", "2000")
                        .param("offeredTerm", "Fall")
                        .param("department", "COMS")
                        .param("page", "0")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].courseIdent", is("COMS_2280")));

        verify(courseService).filterCourse("2000", "Fall", "COMS", 0, 50);
    }

    // ------- UPDATE --------

    @Test
    void update_returnsUpdatedCourse() throws Exception {
        CourseUpdater updater = new CourseUpdater();
        updater.setName("Updated Name");
        updater.setCredits(4);

        Course updated = buildSampleCourse(1L, "COMS_2280");
        updated.setName("Updated Name");
        updated.setCredits(4);

        when(courseService.updateCourse(eq(1L), any(CourseUpdater.class))).thenReturn(updated);

        mockMvc.perform(put("/api/courses/update/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updater)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Updated Name")))
                .andExpect(jsonPath("$.credits", is(4)));

        verify(courseService).updateCourse(eq(1L), any(CourseUpdater.class));
    }

    // ------- DELETE --------

    @Test
    void delete_returnsNoContent() throws Exception {
        Mockito.doNothing().when(courseService).deleteById(1L);

        mockMvc.perform(delete("/api/courses/delete/{id}", 1L))
                .andExpect(status().isNoContent());

        verify(courseService).deleteById(1L);
    }
}

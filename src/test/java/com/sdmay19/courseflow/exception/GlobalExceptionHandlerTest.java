package com.sdmay19.courseflow.exception;

import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void handleIllegalArgumentException_returnsBadRequestPayload() throws Exception {
        mockMvc.perform(get("/illegal").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("bad input"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void handleCourseNotFoundException_returnsNotFoundPayload() throws Exception {
        mockMvc.perform(get("/course").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("missing course"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/illegal")
        String illegal() {
            throw new IllegalArgumentException("bad input");
        }

        @GetMapping("/course")
        String course() {
            throw new CourseNotFoundException("missing course");
        }
    }
}

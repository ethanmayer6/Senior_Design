package com.sdmay19.courseflow.course;

import java.util.List;

public record CoursePageResponse(
        List<Course> courses,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}

package com.sdmay19.courseflow.professor;

public record ProfessorDirectoryStatusResponse(
        boolean ready,
        boolean seeding,
        long professorCount) {
}

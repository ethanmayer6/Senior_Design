package com.sdmay19.courseflow.professor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ProfessorDirectoryNormalizerTest {

    @Test
    void stripsPracticePrefixFromDepartment() {
        String normalized = ProfessorDirectoryNormalizer.canonicalizeDepartment(
                "Practice, Industrial and Manufacturing Systems Engineering",
                "Professor of Practice, Industrial and Manufacturing Systems Engineering");

        assertEquals("Industrial and Manufacturing Systems Engineering", normalized);
    }

    @Test
    void keepsPrimaryDepartmentWhenSecondaryAppointmentExists() {
        String normalized = ProfessorDirectoryNormalizer.canonicalizeDepartment(
                "Electrical and Computer Engineering; Professor of Mathematics",
                "Professor of Electrical and Computer Engineering; Professor of Mathematics");

        assertEquals("Electrical and Computer Engineering", normalized);
    }

    @Test
    void fallsBackToInstructorInTitleWhenDepartmentIsMissing() {
        String normalized = ProfessorDirectoryNormalizer.canonicalizeDepartment(
                null,
                "Adjunct Instructor in Military Science and Tactics");

        assertEquals("Military Science and Tactics", normalized);
    }

    @Test
    void fallsBackToCommaSeparatedDepartmentWhenNeeded() {
        String normalized = ProfessorDirectoryNormalizer.canonicalizeDepartment(
                null,
                "Associate Professor, Library");

        assertEquals("Library", normalized);
    }

    @Test
    void returnsNullWhenNothingUsableExists() {
        assertNull(ProfessorDirectoryNormalizer.canonicalizeDepartment(null, null));
    }
}

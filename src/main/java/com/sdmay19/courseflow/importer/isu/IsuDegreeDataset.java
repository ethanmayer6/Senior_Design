package com.sdmay19.courseflow.importer.isu;

import java.util.List;
import java.util.Set;

public record IsuDegreeDataset(
        String source,
        String catalogYear,
        List<CourseImport> courses,
        List<MajorImport> majors) {

    public record CourseImport(
            String courseIdent,
            String name,
            Integer credits,
            String prereqTxt,
            Set<String> prerequisites,
            String description,
            String hours,
            String offered) {
    }

    public record RequirementGroupImport(
            String name,
            Integer satisfyingCredits,
            List<String> courseIdents) {
    }

    public record DegreeRequirementImport(
            String name,
            Integer satisfyingCredits,
            List<String> courseIdents,
            List<RequirementGroupImport> requirementGroups) {
    }

    public record MajorImport(
            String name,
            String college,
            String description,
            List<DegreeRequirementImport> degreeRequirements) {
    }
}


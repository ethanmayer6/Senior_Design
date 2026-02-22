package com.sdmay19.courseflow.importer.isu;

import java.util.ArrayList;
import java.util.List;

public class IsuDegreeImportResult {
    private int coursesCreated;
    private int coursesUpdated;
    private int majorsCreated;
    private int majorsUpdated;
    private int requirementsCreated;
    private int requirementGroupsCreated;
    private final List<String> warnings = new ArrayList<>();

    public int getCoursesCreated() {
        return coursesCreated;
    }

    public void incrementCoursesCreated() {
        this.coursesCreated++;
    }

    public int getCoursesUpdated() {
        return coursesUpdated;
    }

    public void incrementCoursesUpdated() {
        this.coursesUpdated++;
    }

    public int getMajorsCreated() {
        return majorsCreated;
    }

    public void incrementMajorsCreated() {
        this.majorsCreated++;
    }

    public int getMajorsUpdated() {
        return majorsUpdated;
    }

    public void incrementMajorsUpdated() {
        this.majorsUpdated++;
    }

    public int getRequirementsCreated() {
        return requirementsCreated;
    }

    public void incrementRequirementsCreated() {
        this.requirementsCreated++;
    }

    public int getRequirementGroupsCreated() {
        return requirementGroupsCreated;
    }

    public void incrementRequirementGroupsCreated() {
        this.requirementGroupsCreated++;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void addWarning(String warning) {
        if (warning != null && !warning.isBlank()) {
            warnings.add(warning);
        }
    }
}


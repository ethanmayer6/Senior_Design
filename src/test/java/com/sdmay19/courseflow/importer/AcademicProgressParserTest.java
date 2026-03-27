package com.sdmay19.courseflow.importer;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeout;

class AcademicProgressParserTest {

    private final AcademicProgressParser parser = new AcademicProgressParser();

    @Test
    void parse_extractsNormalizedCoursesCreditsAndMergedRequirementStatus() throws Exception {
        byte[] workbookBytes = workbookBytes(builder -> {
            builder.createSheet("Progress");
            var header = builder.getSheetAt(0).createRow(0);
            header.createCell(0).setCellValue("CREDITS DEFINED");
            header.createCell(1).setCellValue("CREDITS IN PROGRESS");
            header.createCell(2).setCellValue("CREDITS SATISFYING");
            header.createCell(3).setCellValue("REQUIREMENT");
            header.createCell(4).setCellValue("STATUS");
            header.createCell(5).setCellValue("REMAINING");
            header.createCell(6).setCellValue("SATISFIED WITH");
            header.createCell(7).setCellValue("ACADEMIC PERIOD");

            var total = builder.getSheetAt(0).createRow(1);
            total.createCell(0).setCellValue("TOTAL ACADEMIC");
            total.createCell(8).setCellValue(120);
            total.createCell(9).setCellValue(3);
            total.createCell(10).setCellValue(117);

            var firstRequirementRow = builder.getSheetAt(0).createRow(2);
            firstRequirementRow.createCell(3).setCellValue("Core Courses");
            firstRequirementRow.createCell(4).setCellValue("Not Satisfied");
            firstRequirementRow.createCell(5).setCellValue(6);
            firstRequirementRow.createCell(6).setCellValue("COM S 227 - Computer Organization");
            firstRequirementRow.createCell(7).setCellValue("2025 Spring Semester");

            var secondRequirementRow = builder.getSheetAt(0).createRow(3);
            secondRequirementRow.createCell(3).setCellValue("Core Courses");
            secondRequirementRow.createCell(4).setCellValue("In Progress");
            secondRequirementRow.createCell(5).setCellValue(3);
            secondRequirementRow.createCell(6).setCellValue("SE 491 - Senior Design");
            secondRequirementRow.createCell(7).setCellValue("2026 Fall Semester");
        });

        AcademicProgressParser.ParsedReport report = parser.parse(new ByteArrayInputStream(workbookBytes));

        assertThat(report.credits().creditsDefined()).isEqualTo(120);
        assertThat(report.credits().creditsInProgress()).isEqualTo(3);
        assertThat(report.credits().creditsSatisfying()).isEqualTo(117);

        assertThat(report.rows())
                .extracting(AcademicProgressParser.ParsedRow::courseCode, AcademicProgressParser.ParsedRow::academicPeriod)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("COMS_2270", "SPRING2025"),
                        org.assertj.core.groups.Tuple.tuple("SE_4910", "FALL2026"));

        assertThat(report.requirements()).hasSize(1);
        AcademicProgressParser.ParsedRequirement requirement = report.requirements().get(0);
        assertThat(requirement.name()).isEqualTo("Core Courses");
        assertThat(requirement.status()).isEqualTo("IN_PROGRESS");
        assertThat(requirement.remainingCredits()).isEqualTo(3);
    }

    @Test
    void parse_handlesLargeAcademicProgressWorkbookWithinReasonableBudget() throws Exception {
        byte[] workbookBytes = workbookBytes(builder -> {
            builder.createSheet("Progress");

            var header = builder.getSheetAt(0).createRow(0);
            header.createCell(0).setCellValue("CREDITS DEFINED");
            header.createCell(1).setCellValue("CREDITS IN PROGRESS");
            header.createCell(2).setCellValue("CREDITS SATISFYING");
            header.createCell(3).setCellValue("REQUIREMENT");
            header.createCell(4).setCellValue("STATUS");
            header.createCell(5).setCellValue("REMAINING");
            header.createCell(6).setCellValue("SATISFIED WITH");
            header.createCell(7).setCellValue("ACADEMIC PERIOD");

            var total = builder.getSheetAt(0).createRow(1);
            total.createCell(0).setCellValue("TOTAL ACADEMIC");
            total.createCell(8).setCellValue(120);
            total.createCell(9).setCellValue(12);
            total.createCell(10).setCellValue(108);

            for (int i = 0; i < 400; i++) {
                var row = builder.getSheetAt(0).createRow(i + 2);
                row.createCell(3).setCellValue("Core Courses");
                row.createCell(4).setCellValue(i % 3 == 0 ? "Satisfied" : "In Progress");
                row.createCell(5).setCellValue(i % 6);
                row.createCell(6).setCellValue("COM S " + (227 + i % 40) + " - Imported Course " + i);
                row.createCell(7).setCellValue(i % 2 == 0 ? "2025 Spring Semester" : "2025 Fall Semester");
            }
        });

        assertTimeout(Duration.ofSeconds(5), () -> {
            AcademicProgressParser.ParsedReport report =
                    parser.parse(new ByteArrayInputStream(workbookBytes));

            assertThat(report.rows()).hasSize(400);
            assertThat(report.requirements()).singleElement()
                    .extracting(AcademicProgressParser.ParsedRequirement::name)
                    .isEqualTo("Core Courses");
        });
    }

    private byte[] workbookBytes(WorkbookCustomizer customizer) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            customizer.customize(workbook);
            workbook.write(output);
            return output.toByteArray();
        }
    }

    @FunctionalInterface
    private interface WorkbookCustomizer {
        void customize(XSSFWorkbook workbook) throws Exception;
    }
}

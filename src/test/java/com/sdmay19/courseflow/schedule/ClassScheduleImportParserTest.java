package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.semester.Term;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeout;

class ClassScheduleImportParserTest {

    private final ClassScheduleImportParser parser = new ClassScheduleImportParser();

    @Test
    void parse_extractsNormalizedScheduleRowFromWorkbook() throws Exception {
        byte[] workbookBytes = workbookBytes(builder -> {
            builder.createSheet("Schedule");
            builder.getSheetAt(0).createRow(1).createCell(0).setCellValue("Student Schedule");

            var header = builder.getSheetAt(0).createRow(2);
            header.createCell(0).setCellValue("Academic Period");
            header.createCell(1).setCellValue("Course Section");
            header.createCell(2).setCellValue("Meeting Patterns");
            header.createCell(3).setCellValue("Free Drop Deadline");
            header.createCell(4).setCellValue("Withdraw Without Extenuating Circumstances Deadline");
            header.createCell(5).setCellValue("Instructor");
            header.createCell(6).setCellValue("Delivery Mode");
            header.createCell(7).setCellValue("Locations");
            header.createCell(8).setCellValue("Instructional Format");

            var row = builder.getSheetAt(0).createRow(3);
            row.createCell(0).setCellValue("2026 Spring Semester (1/13/2026 - 5/8/2026)");
            row.createCell(1).setCellValue("COMS 2270-A - Computer Organization");
            row.createCell(2).setCellValue("MWF | 9:00 AM - 9:50 AM");
            row.createCell(3).setCellValue("1/20/2026");
            row.createCell(4).setCellValue("3/20/2026");
            row.createCell(5).setCellValue("Ada Lovelace");
            row.createCell(6).setCellValue("In Person");
            row.createCell(7).setCellValue("Coover Hall");
            row.createCell(8).setCellValue("Lecture");
        });

        List<ClassScheduleImportParser.ParsedScheduleRow> rows =
                parser.parse(new ByteArrayInputStream(workbookBytes));

        assertThat(rows).hasSize(1);
        ClassScheduleImportParser.ParsedScheduleRow row = rows.get(0);
        assertThat(row.year()).isEqualTo(2026);
        assertThat(row.term()).isEqualTo(Term.SPRING);
        assertThat(row.courseIdent()).isEqualTo("COMS_2270");
        assertThat(row.sectionCode()).isEqualTo("COMS2270-A");
        assertThat(row.courseTitle()).isEqualTo("Computer Organization");
        assertThat(row.meetingDays()).isEqualTo("MWF");
        assertThat(row.meetingStartTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(row.meetingEndTime()).isEqualTo(LocalTime.of(9, 50));
        assertThat(row.freeDropDeadline()).isEqualTo(LocalDate.of(2026, 1, 20));
        assertThat(row.withdrawDeadline()).isEqualTo(LocalDate.of(2026, 3, 20));
    }

    @Test
    void parse_returnsEmptyListWhenHeaderRowIsMissing() throws Exception {
        byte[] workbookBytes = workbookBytes(builder -> builder.createSheet("Schedule"));

        List<ClassScheduleImportParser.ParsedScheduleRow> rows =
                parser.parse(new ByteArrayInputStream(workbookBytes));

        assertThat(rows).isEmpty();
    }

    @Test
    void parse_handlesLargeScheduleWorkbookWithinReasonableBudget() throws Exception {
        byte[] workbookBytes = workbookBytes(builder -> {
            builder.createSheet("Schedule");
            builder.getSheetAt(0).createRow(1).createCell(0).setCellValue("Student Schedule");

            var header = builder.getSheetAt(0).createRow(2);
            header.createCell(0).setCellValue("Academic Period");
            header.createCell(1).setCellValue("Course Section");
            header.createCell(2).setCellValue("Meeting Patterns");
            header.createCell(3).setCellValue("Free Drop Deadline");
            header.createCell(4).setCellValue("Withdraw Without Extenuating Circumstances Deadline");
            header.createCell(5).setCellValue("Instructor");
            header.createCell(6).setCellValue("Delivery Mode");
            header.createCell(7).setCellValue("Locations");
            header.createCell(8).setCellValue("Instructional Format");

            for (int i = 0; i < 300; i++) {
                var row = builder.getSheetAt(0).createRow(i + 3);
                row.createCell(0).setCellValue(i % 2 == 0
                        ? "2026 Spring Semester (1/13/2026 - 5/8/2026)"
                        : "2026 Fall Semester (8/24/2026 - 12/18/2026)");
                row.createCell(1).setCellValue("COMS " + (227 + i % 20) + "0-A - Imported Course " + i);
                row.createCell(2).setCellValue("MWF | 9:00 AM - 9:50 AM");
                row.createCell(3).setCellValue("1/20/2026");
                row.createCell(4).setCellValue("3/20/2026");
                row.createCell(5).setCellValue("Ada Lovelace");
                row.createCell(6).setCellValue("In Person");
                row.createCell(7).setCellValue("Coover Hall");
                row.createCell(8).setCellValue("Lecture");
            }
        });

        assertTimeout(Duration.ofSeconds(5), () -> {
            List<ClassScheduleImportParser.ParsedScheduleRow> rows =
                    parser.parse(new ByteArrayInputStream(workbookBytes));

            assertThat(rows).hasSize(300);
            assertThat(rows).allSatisfy(row -> assertThat(row.courseIdent()).startsWith("COMS_"));
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

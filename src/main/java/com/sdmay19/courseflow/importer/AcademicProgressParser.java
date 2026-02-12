package com.sdmay19.courseflow.importer;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AcademicProgressParser {

    // Matches ANY course prefix up to the hyphen
    private static final Pattern COURSE_PATTERN = Pattern.compile("^.+?\\s*-");

    // Temporary parsed object – no need to create a full model
    public record ParsedRow(
            String courseCode,
            String courseTitle,
            String academicPeriod // "FALL2022" or null
    ) {
    }

    public record ParsedCredits(
            Integer creditsDefined,
            Integer creditsSatisfying,
            Integer creditsInProgress) {
    }

    public record ParsedReport(
            List<ParsedRow> rows,
            ParsedCredits credits) {
    }

    /**
     * Main entry point for parsing the academic record Excel file.
     */
    public ParsedReport parse(InputStream excelStream) {
        List<ParsedRow> results = new ArrayList<>();
        ParsedCredits parsedCredits = new ParsedCredits(null, null, null);

        try (Workbook workbook = new XSSFWorkbook(excelStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            int creditsDefinedCol = -1;
            int creditsInProgressCol = -1;
            int creditsSatisfyingCol = -1;

            for (Row row : sheet) {
                for (Cell cell : row) {
                    String value = getString(cell);
                    if (value == null || value.isBlank()) {
                        continue;
                    }

                    String normalized = value.trim().toUpperCase();
                    if (normalized.equals("CREDITS DEFINED")) {
                        creditsDefinedCol = cell.getColumnIndex();
                    } else if (normalized.equals("CREDITS IN PROGRESS")) {
                        creditsInProgressCol = cell.getColumnIndex();
                    } else if (normalized.equals("CREDITS SATISFYING")) {
                        creditsSatisfyingCol = cell.getColumnIndex();
                    }
                }

                if (isTotalAcademicRow(row)) {
                    Integer defined = getNumericFromRow(row, creditsDefinedCol);
                    Integer inProgress = getNumericFromRow(row, creditsInProgressCol);
                    Integer satisfying = getNumericFromRow(row, creditsSatisfyingCol);

                    if (defined == null || satisfying == null) {
                        List<Integer> values = extractNumericCells(row);
                        if (values.size() >= 3) {
                            if (defined == null) {
                                defined = values.get(0);
                            }
                            if (inProgress == null) {
                                inProgress = values.get(1);
                            }
                            if (satisfying == null) {
                                satisfying = values.get(2);
                            }
                        }
                    }

                    if (defined != null || satisfying != null || inProgress != null) {
                        parsedCredits = new ParsedCredits(defined, satisfying, inProgress);
                    }
                }

                Cell satisfiedWithCell = row.getCell(3); // Column D
                Cell academicPeriodCell = row.getCell(4); // Column E

                if (satisfiedWithCell == null)
                    continue;

                String satisfiedWith = getString(satisfiedWithCell);

                if (satisfiedWith == null || satisfiedWith.isBlank())
                    continue;

                // Check if cell contains a real course
                if (!COURSE_PATTERN.matcher(satisfiedWith.trim()).find())
                    continue;

                // Extract course code + title
                String[] parts = satisfiedWith.split("-", 2);
                if (parts.length < 2)
                    continue;

                String rawCode = parts[0].trim();
                String courseCode = normalizeCourseIdent(rawCode); // ex: "COM S 228" -> "COMS_2280"

                String courseTitle = parts[1].trim(); // ex: "Intro..."

                // Normalize academic period like "FALL2022"
                String academicPeriod = normalizeTerm(getString(academicPeriodCell));

                // Add parsed result
                results.add(new ParsedRow(courseCode, courseTitle, academicPeriod));
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse academic progress report Excel file", e);
        }

        return new ParsedReport(results, parsedCredits);
    }

    /**
     * Convert Excel cell to String safely.
     */
    private String getString(Cell cell) {
        if (cell == null)
            return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> null;
        };
    }

    private boolean isTotalAcademicRow(Row row) {
        for (Cell cell : row) {
            String value = getString(cell);
            if (value == null) {
                continue;
            }
            if (value.trim().toUpperCase().contains("TOTAL ACADEMIC")) {
                return true;
            }
        }
        return false;
    }

    private Integer getNumericFromRow(Row row, int columnIndex) {
        if (columnIndex < 0) {
            return null;
        }
        return getNumeric(row.getCell(columnIndex));
    }

    private Integer getNumeric(Cell cell) {
        if (cell == null) {
            return null;
        }

        if (cell.getCellType() == CellType.NUMERIC) {
            return (int) Math.round(cell.getNumericCellValue());
        }

        String value = getString(cell);
        if (value == null || value.isBlank()) {
            return null;
        }

        Matcher matcher = Pattern.compile("-?\\d+").matcher(value);
        if (!matcher.find()) {
            return null;
        }

        try {
            return Integer.parseInt(matcher.group());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<Integer> extractNumericCells(Row row) {
        List<Integer> values = new ArrayList<>();
        for (Cell cell : row) {
            Integer numeric = getNumeric(cell);
            if (numeric != null) {
                values.add(numeric);
            }
        }
        return values;
    }

    /**
     * Convert academic period into "FALL2022" format.
     */
    private String normalizeTerm(String ap) {
        if (ap == null || ap.isBlank())
            return null;

        // Match patterns like "2025 Spring Semester"
        Matcher m = Pattern.compile("(\\d{4})\\s+([A-Za-z]+)").matcher(ap);
        if (!m.find())
            return null;

        String year = m.group(1);
        String season = m.group(2).toUpperCase();

        return season + year; // "SPRING2025"
    }

    /**
     * Normalizes a course ident so it matches DB formatting exactly.
     * Rules:
     * - Merge all alphabetic tokens before the number (SP CM → SPCM)
     * - Take ONLY the first cross-listed entry
     * - Convert 3-digit course numbers to 4-digit (281 → 2810)
     * - Always produce DEPT_#### format
     */
    private String normalizeCourseIdent(String raw) {
        if (raw == null)
            return null;

        // 1 — Use only the first subject when cross-listed ("COM S 309 / S E 309")
        raw = raw.split("/")[0].trim();

        // 2 — Split into tokens
        String[] tokens = raw.split("\\s+");

        List<String> deptParts = new ArrayList<>();
        String numberPart = null;

        // 3 — Identify department fragments and number
        for (String tok : tokens) {
            if (tok.matches("\\d{3,4}")) {
                numberPart = tok;
                break;
            }
            deptParts.add(tok);
        }

        if (numberPart == null) {
            System.out.println("[WARN] Could not detect number in course ident: '" + raw + "'");
            return raw.replace(" ", "_");
        }

        // 4 — Department = concat all alpha tokens
        String dept = String.join("", deptParts).toUpperCase();

        // 5 — Always ensure 4-digit number
        if (numberPart.length() == 3) {
            numberPart = numberPart + "0";
        }

        return dept + "_" + numberPart;
    }
}

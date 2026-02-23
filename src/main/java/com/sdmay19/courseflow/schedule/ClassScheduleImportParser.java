package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.semester.Term;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ClassScheduleImportParser {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
    private static final Pattern COURSE_IDENT_PATTERN = Pattern.compile("\\b([A-Z]{2,8})\\s*([0-9]{4}[A-Z]?)\\b");
    private static final Pattern SECTION_PATTERN = Pattern.compile("\\b([A-Z]{2,8}\\s*[0-9]{4}[A-Z]?-[A-Z0-9]+)\\b");
    private static final Pattern ACADEMIC_PERIOD_PATTERN = Pattern.compile("(?i)\\b(\\d{4})\\s+(Spring|Summer|Fall)\\s+Semester\\b");
    private static final Pattern DATE_RANGE_PATTERN = Pattern.compile("\\((\\d{1,2}/\\d{1,2}/\\d{4})\\s*-\\s*(\\d{1,2}/\\d{1,2}/\\d{4})\\)");
    private static final Pattern MEETING_PATTERN = Pattern.compile("^\\s*([A-Z]+)\\s*\\|\\s*([0-9]{1,2}:[0-9]{2}\\s*[AP]M)\\s*-\\s*([0-9]{1,2}:[0-9]{2}\\s*[AP]M)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter[] DATE_FORMATTERS = new DateTimeFormatter[] {
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy")
    };

    public List<ParsedScheduleRow> parse(InputStream excelStream) {
        try (Workbook workbook = new XSSFWorkbook(excelStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                return List.of();
            }

            DataFormatter formatter = new DataFormatter();
            int headerRowIndex = findHeaderRow(sheet, formatter);
            if (headerRowIndex < 0) {
                return List.of();
            }

            Map<String, Integer> columnMap = mapHeaderColumns(sheet.getRow(headerRowIndex), formatter);
            List<ParsedScheduleRow> rows = new ArrayList<>();
            int lastRow = sheet.getLastRowNum();
            for (int i = headerRowIndex + 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }

                String courseSection = cell(row, columnMap.get("course_section"), formatter);
                if (courseSection == null || courseSection.isBlank()) {
                    continue;
                }

                String academicPeriod = cell(row, columnMap.get("academic_period"), formatter);
                ParsedPeriod period = parseAcademicPeriod(academicPeriod);
                if (period == null) {
                    continue;
                }

                String meetingPattern = cell(row, columnMap.get("meeting_patterns"), formatter);
                ParsedMeeting meeting = parseMeetingPattern(meetingPattern);

                String courseIdent = parseCourseIdent(courseSection);
                String sectionCode = parseSectionCode(courseSection);
                String courseTitle = parseCourseTitle(courseSection);

                LocalDate freeDrop = parseDate(cell(row, columnMap.get("free_drop_deadline"), formatter));
                LocalDate withdraw = parseDate(cell(row, columnMap.get("withdraw_deadline"), formatter));

                rows.add(new ParsedScheduleRow(
                        period.label(),
                        period.year(),
                        period.term(),
                        period.startDate(),
                        period.endDate(),
                        courseIdent,
                        sectionCode,
                        courseTitle,
                        meetingPattern,
                        meeting == null ? null : meeting.days(),
                        meeting == null ? null : meeting.startTime(),
                        meeting == null ? null : meeting.endTime(),
                        freeDrop,
                        withdraw,
                        cell(row, columnMap.get("instructor"), formatter),
                        cell(row, columnMap.get("delivery_mode"), formatter),
                        cell(row, columnMap.get("locations"), formatter),
                        cell(row, columnMap.get("instructional_format"), formatter)));
            }

            return rows;
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to parse class schedule file: " + e.getMessage(), e);
        }
    }

    private int findHeaderRow(Sheet sheet, DataFormatter formatter) {
        int scanTo = Math.min(sheet.getLastRowNum(), 30);
        for (int i = 0; i <= scanTo; i++) {
            Row row = sheet.getRow(i);
            if (row == null) {
                continue;
            }
            String rowText = formatter.formatCellValue(row.getCell(0)) + " " + formatter.formatCellValue(row.getCell(1));
            if (rowText.toLowerCase(Locale.ROOT).contains("academic period")
                    || rowText.toLowerCase(Locale.ROOT).contains("course section")) {
                return i;
            }
        }
        return -1;
    }

    private Map<String, Integer> mapHeaderColumns(Row headerRow, DataFormatter formatter) {
        Map<String, Integer> map = new HashMap<>();
        short lastCell = headerRow.getLastCellNum();
        for (int c = 0; c < lastCell; c++) {
            String normalized = normalizeHeader(formatter.formatCellValue(headerRow.getCell(c)));
            if (normalized.isBlank()) {
                continue;
            }
            if (normalized.contains("academicperiod")) {
                map.put("academic_period", c);
            } else if (normalized.contains("coursesection")) {
                map.put("course_section", c);
            } else if (normalized.contains("meetingpatterns")) {
                map.put("meeting_patterns", c);
            } else if (normalized.contains("freedropdeadline")) {
                map.put("free_drop_deadline", c);
            } else if (normalized.contains("changeorwithdrawwithoutextenuatingcircumstancesdeadline")
                    || normalized.contains("withdrawwithoutextenuatingcircumstancesdeadline")) {
                map.put("withdraw_deadline", c);
            } else if (normalized.contains("instructor")) {
                map.put("instructor", c);
            } else if (normalized.contains("deliverymode")) {
                map.put("delivery_mode", c);
            } else if (normalized.contains("locations")) {
                map.put("locations", c);
            } else if (normalized.contains("instructionalformat")) {
                map.put("instructional_format", c);
            }
        }
        return map;
    }

    private String normalizeHeader(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private String cell(Row row, Integer column, DataFormatter formatter) {
        if (column == null || column < 0) {
            return "";
        }
        Cell cell = row.getCell(column);
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell).trim();
    }

    private ParsedPeriod parseAcademicPeriod(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        Matcher periodMatcher = ACADEMIC_PERIOD_PATTERN.matcher(raw);
        if (!periodMatcher.find()) {
            return null;
        }

        int year = Integer.parseInt(periodMatcher.group(1));
        Term term = parseTerm(periodMatcher.group(2));
        LocalDate start = null;
        LocalDate end = null;

        Matcher rangeMatcher = DATE_RANGE_PATTERN.matcher(raw);
        if (rangeMatcher.find()) {
            start = parseDate(rangeMatcher.group(1));
            end = parseDate(rangeMatcher.group(2));
        }
        return new ParsedPeriod(raw.trim(), year, term, start, end);
    }

    private Term parseTerm(String raw) {
        if (raw == null) {
            return Term.FALL;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("SPRING".equals(normalized)) {
            return Term.SPRING;
        }
        if ("SUMMER".equals(normalized)) {
            return Term.SUMMER;
        }
        return Term.FALL;
    }

    private ParsedMeeting parseMeetingPattern(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        Matcher matcher = MEETING_PATTERN.matcher(raw);
        if (!matcher.find()) {
            return null;
        }
        String days = matcher.group(1).trim().toUpperCase(Locale.ROOT);
        LocalTime start = parseTime(matcher.group(2));
        LocalTime end = parseTime(matcher.group(3));
        return new ParsedMeeting(days, start, end);
    }

    private LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return LocalTime.parse(raw.trim().toUpperCase(Locale.ROOT), TIME_FORMATTER);
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(trimmed, formatter);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String parseCourseIdent(String courseSection) {
        Matcher matcher = COURSE_IDENT_PATTERN.matcher(courseSection == null ? "" : courseSection.toUpperCase(Locale.ROOT));
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(1) + "_" + matcher.group(2);
    }

    private String parseSectionCode(String courseSection) {
        Matcher matcher = SECTION_PATTERN.matcher(courseSection == null ? "" : courseSection.toUpperCase(Locale.ROOT));
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(1).replaceAll("\\s+", "");
    }

    private String parseCourseTitle(String courseSection) {
        if (courseSection == null) {
            return "";
        }
        int idx = courseSection.indexOf(" - ");
        if (idx < 0 || idx + 3 >= courseSection.length()) {
            return "";
        }
        return courseSection.substring(idx + 3).trim();
    }

    private record ParsedPeriod(String label, int year, Term term, LocalDate startDate, LocalDate endDate) {
    }

    private record ParsedMeeting(String days, LocalTime startTime, LocalTime endTime) {
    }

    public record ParsedScheduleRow(
            String academicPeriodLabel,
            int year,
            Term term,
            LocalDate termStartDate,
            LocalDate termEndDate,
            String courseIdent,
            String sectionCode,
            String courseTitle,
            String meetingPatternRaw,
            String meetingDays,
            LocalTime meetingStartTime,
            LocalTime meetingEndTime,
            LocalDate freeDropDeadline,
            LocalDate withdrawDeadline,
            String instructor,
            String deliveryMode,
            String locations,
            String instructionalFormat) {
    }
}


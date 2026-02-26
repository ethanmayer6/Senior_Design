package com.sdmay19.courseflow.professor;

import java.util.Locale;
import java.util.regex.Pattern;

final class ProfessorDirectoryNormalizer {

    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");
    private static final Pattern LEADING_EMERITUS = Pattern.compile("(?i)^emerit(?:us|a)\\s+");

    private ProfessorDirectoryNormalizer() {
    }

    static String canonicalizeDepartment(String rawDepartment, String title) {
        String cleanedDepartment = cleanDepartmentFragment(rawDepartment);
        if (cleanedDepartment != null) {
            return cleanedDepartment;
        }
        return extractDepartmentFromTitle(title);
    }

    private static String cleanDepartmentFragment(String rawDepartment) {
        String candidate = clean(rawDepartment);
        if (candidate == null) {
            return null;
        }

        candidate = splitFirst(candidate, ";");
        candidate = stripPracticePrefix(candidate);
        candidate = stripLeadingProfessorPhrase(candidate);
        candidate = clean(candidate);
        return candidate;
    }

    static String extractDepartmentFromTitle(String rawTitle) {
        String title = clean(rawTitle);
        if (title == null) {
            return null;
        }

        String firstSegment = splitFirst(title, ";");
        firstSegment = clean(firstSegment);
        if (firstSegment == null) {
            return null;
        }

        String lower = firstSegment.toLowerCase(Locale.ROOT);
        String candidate = null;

        if (lower.contains(" of ")) {
            candidate = substringAfterLast(firstSegment, " of ");
        } else if (lower.contains(" in ")) {
            candidate = substringAfterLast(firstSegment, " in ");
        } else if (firstSegment.contains(",")) {
            candidate = firstSegment.substring(firstSegment.indexOf(',') + 1);
        }

        candidate = clean(candidate);
        candidate = stripPracticePrefix(candidate);
        candidate = stripLeadingProfessorPhrase(candidate);
        candidate = clean(candidate);
        return candidate;
    }

    private static String stripPracticePrefix(String value) {
        String candidate = clean(value);
        if (candidate == null) {
            return null;
        }
        String lower = candidate.toLowerCase(Locale.ROOT);
        if (lower.startsWith("practice,")) {
            return clean(candidate.substring("practice,".length()));
        }
        return candidate;
    }

    private static String stripLeadingProfessorPhrase(String value) {
        String candidate = clean(value);
        if (candidate == null) {
            return null;
        }

        candidate = LEADING_EMERITUS.matcher(candidate).replaceFirst("");
        String lower = candidate.toLowerCase(Locale.ROOT);
        if (lower.startsWith("professor of ")) {
            return clean(candidate.substring("professor of ".length()));
        }
        if (lower.startsWith("professor, ")) {
            return clean(candidate.substring("professor, ".length()));
        }
        return candidate;
    }

    private static String substringAfterLast(String source, String token) {
        String lower = source.toLowerCase(Locale.ROOT);
        int index = lower.lastIndexOf(token.toLowerCase(Locale.ROOT));
        if (index < 0) {
            return source;
        }
        return source.substring(index + token.length());
    }

    private static String splitFirst(String value, String delimiter) {
        int index = value.indexOf(delimiter);
        if (index < 0) {
            return value;
        }
        return value.substring(0, index);
    }

    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = MULTI_SPACE.matcher(value.trim()).replaceAll(" ");
        return trimmed.isBlank() ? null : trimmed.replaceAll("^[,\\s]+|[,\\s]+$", "");
    }
}

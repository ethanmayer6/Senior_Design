package com.sdmay19.courseflow.importer;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class AcademicProgressService {

    private final AcademicProgressParser parser;
    private final CourseRepository courseRepository;

    public AcademicProgressService(AcademicProgressParser parser, CourseRepository courseRepository) {
        this.parser = parser;
        this.courseRepository = courseRepository;
    }


    // ----------------------------------------------------------------------
    // 1. PROCESS PROGRESS REPORT → map rows into our normalized format
    // ----------------------------------------------------------------------
    public StudentProgressResult processProgress(MultipartFile file) {
        try {
            List<AcademicProgressParser.ParsedRow> parsed =
                    parser.parse(file.getInputStream());

            List<MappedCourse> isuCourses = new ArrayList<>();
            List<MappedCourse> transferCourses = new ArrayList<>();
            List<String> unmatchedCourses = new ArrayList<>();

            for (var row : parsed) {
                String normalized = normalizeCourseCode(row.courseCode());
                Course catalogCourse = courseRepository
                        .findByCourseIdent(normalized)
                        .orElse(null);

                if (catalogCourse == null) {
                    unmatchedCourses.add(row.courseCode());
                    continue;
                }

                MappedCourse mapped = new MappedCourse(
                        catalogCourse.getCourseIdent(),
                        catalogCourse.getName(),
                        row.academicPeriod(),   // FALL2022 or null
                        catalogCourse.getCredits()
                );

                if (row.academicPeriod() != null) {
                    isuCourses.add(mapped);
                } else {
                    transferCourses.add(mapped);
                }
            }

            return new StudentProgressResult(isuCourses, transferCourses, unmatchedCourses);

        } catch (Exception e) {
            throw new RuntimeException("Failed to process academic progress report", e);
        }
    }


    // ----------------------------------------------------------------------
    // 2. BUILD FLOWCHART GRAPH (only relevant courses)
    // ----------------------------------------------------------------------
    public FlowchartResult buildFlowchartFromProgress(MultipartFile file) {

        // 2.1 parse progress
        var parsed = processProgress(file);

        // 2.2 list of completed course IDs
        List<String> completed = new ArrayList<>(
                parsed.isuCourses().stream().map(MappedCourse::courseCode).toList()
        );
        completed.addAll(
                parsed.transferCourses().stream().map(MappedCourse::courseCode).toList()
        );

        // 2.3 relevant courses (completed + all their prerequisites)
        Set<Course> relevant = new HashSet<>();

        // add completed courses
        for (String code : completed) {
            courseRepository.findByCourseIdent(code).ifPresent(relevant::add);
        }

        // recursively add all ancestors (prereqs of prereqs)
        Deque<String> stack = new ArrayDeque<>(completed);

        while (!stack.isEmpty()) {
            String code = stack.pop();

            var courseOpt = courseRepository.findByCourseIdent(code);
            if (courseOpt.isEmpty()) continue;

            Course c = courseOpt.get();
            relevant.add(c);

            for (String pre : c.getPrerequisites()) {
                boolean alreadyIncluded = relevant.stream()
                        .anyMatch(x -> x.getCourseIdent().equals(pre));

                if (!alreadyIncluded) {
                    stack.push(pre);
                }
            }
        }

        // ❌ NO unlocked descendants here (this prevented the huge graph)

        // 2.4 build edges only among relevant courses
        List<String[]> edges = new ArrayList<>();

        for (Course c : relevant) {
            for (String pre : c.getPrerequisites()) {
                // ensure prereq exists in catalog — skip unmatched prereqs
                var preOpt = courseRepository.findByCourseIdent(pre);
                if (preOpt.isEmpty()) {
                    continue;
                }
            
                boolean prereqIncluded =
                        relevant.stream().anyMatch(r -> r.getCourseIdent().equals(pre));
            
                if (prereqIncluded) {
                    edges.add(new String[]{pre, c.getCourseIdent()});
                }
            }
        }

        // 2.5 academic periods mapping (courseIdent -> PERIOD)
        Map<String, String> periods = new HashMap<>();
        parsed.isuCourses().forEach(mc -> periods.put(mc.courseCode(), mc.academicPeriod()));
        parsed.transferCourses().forEach(mc -> periods.put(mc.courseCode(), mc.academicPeriod()));

        // 2.6 return DTO
        return new FlowchartResult(
                new ArrayList<>(relevant),
                edges,
                completed,
                periods   // FIXED: correct variable passed here
        );
    }


    // ----------------------------------------------------------------------
    // NORMALIZE COURSE CODE: "Com S 228" → "COMS_2280"
    // ----------------------------------------------------------------------
    private String normalizeCourseCode(String raw) {
        if (raw == null || raw.isBlank()) return raw;

        raw = raw.trim().replaceAll("\\s+", " ");

        String[] parts = raw.split(" ");
        if (parts.length < 2) return raw;

        String dept = parts[0].toUpperCase();
        String number = parts[1].toUpperCase();

        String base = number.replaceAll("[^0-9]", "");
        String suffix = number.replaceAll("[0-9]", "");

        if (base.length() == 3) {
            base = base + "0"; // 228 → 2280
        }

        String finalNumber = base + suffix;

        return dept + "_" + finalNumber;
    }


    // ----------------------------------------------------------------------
    // DTO RECORDS
    // ----------------------------------------------------------------------
    public record MappedCourse(
            String courseCode,
            String courseName,
            String academicPeriod,
            int credits
    ) {}

    public record StudentProgressResult(
            List<MappedCourse> isuCourses,
            List<MappedCourse> transferCourses,
            List<String> unmatchedCourses
    ) {}

    public record FlowchartResult(
            List<Course> courses,
            List<String[]> edges,
            List<String> completedCourses,
            Map<String, String> academicPeriods
    ) {}
}
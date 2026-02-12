package com.sdmay19.courseflow.importer;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

@Service
public class AcademicProgressService {

    private final AcademicProgressParser parser;
    private final CourseRepository courseRepository;
    private final FlowchartService flowchartService;
    private final MajorRepository majorRepository;

    @Autowired
    public AcademicProgressService(
            AcademicProgressParser parser,
            CourseRepository courseRepository,
            FlowchartService flowchartService,
            MajorRepository majorRepository) {
        this.parser = parser;
        this.courseRepository = courseRepository;
        this.flowchartService = flowchartService;
        this.majorRepository = majorRepository;
    }

    // ----------------------------------------------------------------------
    // 1. PROCESS PROGRESS REPORT → map rows into our normalized format
    // ----------------------------------------------------------------------
    public StudentProgressResult processProgress(MultipartFile file) {
        try {
            AcademicProgressParser.ParsedReport parsedReport = parser.parse(file.getInputStream());
            List<AcademicProgressParser.ParsedRow> parsed = parsedReport.rows();

            List<MappedCourse> isuCourses = new ArrayList<>();
            List<MappedCourse> transferCourses = new ArrayList<>();
            List<String> unmatchedCourses = new ArrayList<>();

            for (var row : parsed) {
                // parser already returns a normalized ident, like "SE_1010"
                String ident = row.courseCode();

                Optional<Course> optCourse = courseRepository.findByCourseIdent(ident);

                if (optCourse.isEmpty()) {
                    System.out.println("[WARN] Could not match course ident from progress: '"
                            + row.courseCode() + "' (normalized: '" + ident + "')");
                    unmatchedCourses.add(row.courseCode());
                    continue;
                }

                Course catalogCourse = optCourse.get();

                MappedCourse mapped = new MappedCourse(
                        catalogCourse.getCourseIdent(),
                        catalogCourse.getName(),
                        row.academicPeriod(), // e.g. "FALL2022" or null
                        catalogCourse.getCredits());

                if (row.academicPeriod() != null) {
                    isuCourses.add(mapped);
                } else {
                    transferCourses.add(mapped);
                }
            }

            System.out.println("[INFO] Parsed progress: "
                    + isuCourses.size() + " ISU courses, "
                    + transferCourses.size() + " transfer courses, "
                    + unmatchedCourses.size() + " unmatched.");

            Integer creditsDefined = parsedReport.credits() == null ? null : parsedReport.credits().creditsDefined();
            Integer creditsSatisfying = parsedReport.credits() == null ? null : parsedReport.credits().creditsSatisfying();
            Integer creditsInProgress = parsedReport.credits() == null ? null : parsedReport.credits().creditsInProgress();

            return new StudentProgressResult(
                    isuCourses,
                    transferCourses,
                    unmatchedCourses,
                    creditsDefined,
                    creditsSatisfying,
                    creditsInProgress);

        } catch (Exception e) {
            throw new RuntimeException("Failed to process academic progress report", e);
        }
    }

    // ----------------------------------------------------------------------
    // 2. BUILD FLOWCHART GRAPH (minimal projection used by ReactFlow, if needed)
    // ----------------------------------------------------------------------
    public FlowchartResult buildFlowchartFromProgress(MultipartFile file) {

        StudentProgressResult parsed = processProgress(file);
        if (parsed.isuCourses().isEmpty() && parsed.transferCourses().isEmpty()) {
            throw new IllegalArgumentException(
                    "No courses were parsed from this report. Please upload an ISU academic progress .xlsx export.");
        }

        // completed = all matched courses (ISU + transfer)
        List<String> completed = new ArrayList<>();
        completed.addAll(parsed.isuCourses().stream().map(MappedCourse::courseCode).toList());
        completed.addAll(parsed.transferCourses().stream().map(MappedCourse::courseCode).toList());

        // relevant courses = completed + all prereq ancestors
        Set<Course> relevant = new HashSet<>();

        // add completed courses
        for (String code : completed) {
            courseRepository.findByCourseIdent(code).ifPresent(relevant::add);
        }

        // recursively add all prerequisites of those courses
        Deque<String> stack = new ArrayDeque<>(completed);
        while (!stack.isEmpty()) {
            String code = stack.pop();

            Optional<Course> courseOpt = courseRepository.findByCourseIdent(code);
            if (courseOpt.isEmpty())
                continue;

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

        // build edges only among relevant courses
        List<String[]> edges = new ArrayList<>();
        for (Course c : relevant) {
            for (String pre : c.getPrerequisites()) {
                Optional<Course> preOpt = courseRepository.findByCourseIdent(pre);
                if (preOpt.isEmpty())
                    continue;

                boolean prereqIncluded = relevant.stream()
                        .anyMatch(r -> r.getCourseIdent().equals(pre));
                if (prereqIncluded) {
                    edges.add(new String[] { pre, c.getCourseIdent() });
                }
            }
        }

        // academic periods map (courseIdent -> PERIOD)
        Map<String, String> periods = new HashMap<>();
        parsed.isuCourses().forEach(mc -> periods.put(mc.courseCode(), mc.academicPeriod()));
        parsed.transferCourses().forEach(mc -> periods.put(mc.courseCode(), mc.academicPeriod()));

        System.out.println("[INFO] buildFlowchartFromProgress: relevant=" + relevant.size()
                + ", edges=" + edges.size());

        return new FlowchartResult(
                new ArrayList<>(relevant),
                edges,
                completed,
                periods);
    }

    // ----------------------------------------------------------------------
    // 3. CREATE & SAVE FLOWCHART ENTITY FOR USER
    // ----------------------------------------------------------------------
    public Flowchart createFlowchartFromProgress(MultipartFile file, AppUser user) {
        // Step 1 — process the transcript
        StudentProgressResult parsed = processProgress(file);

        // Step 2 — courseStatusMap (derived from academic period vs current term)
        Map<String, MappedCourse> dedupedByCourse = new HashMap<>();
        List<MappedCourse> allMapped = new ArrayList<>();
        allMapped.addAll(parsed.transferCourses());
        allMapped.addAll(parsed.isuCourses());

        for (MappedCourse mc : allMapped) {
            MappedCourse existing = dedupedByCourse.get(mc.courseCode());
            if (existing == null || shouldReplace(existing, mc)) {
                dedupedByCourse.put(mc.courseCode(), mc);
            }
        }

        Map<String, Status> statusMap = new HashMap<>();
        dedupedByCourse.values().forEach(mc -> {
            String normalizedPeriod = normalizePeriod(mc.academicPeriod(), "TRANSFER");
            statusMap.put(mc.courseCode(), inferStatusFromPeriod(normalizedPeriod));
        });

        // Step 3 — group courses by academic period
        Map<String, List<Course>> coursesByPeriod = new HashMap<>();

        // helper for grouping
        java.util.function.BiConsumer<MappedCourse, String> addToPeriod = (mc, defaultPeriod) -> {

            String period = normalizePeriod(mc.academicPeriod(), defaultPeriod);

            courseRepository.findByCourseIdent(mc.courseCode())
                    .ifPresent(course -> {
                        coursesByPeriod
                                .computeIfAbsent(period, k -> new ArrayList<>())
                                .add(course);
                    });
        };

        dedupedByCourse.values().forEach(mc -> {
            String fallback = (mc.academicPeriod() == null || mc.academicPeriod().isBlank()) ? "TRANSFER" : "NO_PERIOD";
            addToPeriod.accept(mc, fallback);
        });

        // Step 4 — compute credits from *all* grouped courses
        int computedCredits = coursesByPeriod.values().stream()
                .flatMap(List::stream)
                .mapToInt(Course::getCredits)
                .sum();

        int totalCredits = parsed.creditsDefined() != null && parsed.creditsDefined() > 0
                ? parsed.creditsDefined()
                : computedCredits;
        int satisfiedCredits = parsed.creditsSatisfying() != null && parsed.creditsSatisfying() >= 0
                ? parsed.creditsSatisfying()
                : computedCredits;
        if (satisfiedCredits > totalCredits && totalCredits > 0) {
            satisfiedCredits = totalCredits;
        }

        System.out.println("[INFO] createFlowchartFromProgress: periods="
                + coursesByPeriod.size() + ", totalCredits=" + totalCredits);

        // Step 5 — get user's major
        String userMajorName = user.getMajor();
        if (userMajorName == null || userMajorName.isBlank()) {
            throw new IllegalArgumentException("User has no major set.");
        }

        Major major = resolveMajor(userMajorName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Major not found in database: " + userMajorName
                                + ". Update your profile major to match an existing catalog major."));

        // Step 6 — delegate to FlowchartService to actually build & save semesters +
        // flowchart
        return flowchartService.createFromProgress(
                user,
                major,
                statusMap,
                coursesByPeriod,
                totalCredits,
                satisfiedCredits);
    }

    private String normalizePeriod(String raw, String defaultPeriod) {
        if (raw == null || raw.isBlank()) {
            return defaultPeriod; // NO_PERIOD or TRANSFER
        }

        raw = raw.trim().toUpperCase().replace(" ", "");

        // Handle correct formats: FALL2022, SPRING2021, SUMMER2020, WINTER2023
        if (raw.matches("(FALL|SPRING|SUMMER|WINTER)[0-9]{4}")) {
            return raw;
        }

        // Handle shorthand formats like FALL21 → FALL2021
        if (raw.matches("(FALL|SPRING|SUMMER|WINTER)[0-9]{2}")) {
            String year2 = raw.substring(raw.length() - 2);
            return raw.substring(0, raw.length() - 2) + "20" + year2;
        }

        // Transfer courses always go to TRANSFER
        if (raw.contains("TRANSFER")) {
            return "TRANSFER";
        }

        // Anything else is invalid → put into default bucket
        return defaultPeriod;
    }

    private boolean shouldReplace(MappedCourse existing, MappedCourse candidate) {
        String existingPeriod = normalizePeriod(existing.academicPeriod(), "TRANSFER");
        String candidatePeriod = normalizePeriod(candidate.academicPeriod(), "TRANSFER");

        boolean existingIsTransfer = "TRANSFER".equals(existingPeriod);
        boolean candidateIsTransfer = "TRANSFER".equals(candidatePeriod);

        if (existingIsTransfer && !candidateIsTransfer) {
            return true;
        }
        if (!existingIsTransfer && candidateIsTransfer) {
            return false;
        }

        return periodRank(candidatePeriod) > periodRank(existingPeriod);
    }

    private int periodRank(String period) {
        if (period == null || period.isBlank()) {
            return Integer.MIN_VALUE;
        }
        if ("TRANSFER".equals(period)) {
            return -1;
        }

        String upper = period.toUpperCase(Locale.ROOT);
        int year = 0;
        java.util.regex.Matcher yearMatcher = java.util.regex.Pattern.compile("(\\d{4})").matcher(upper);
        while (yearMatcher.find()) {
            year = Integer.parseInt(yearMatcher.group(1));
        }

        int termRank = 0;
        if (upper.contains("SPRING")) {
            termRank = 1;
        } else if (upper.contains("SUMMER")) {
            termRank = 2;
        } else if (upper.contains("FALL")) {
            termRank = 3;
        } else if (upper.contains("WINTER")) {
            termRank = 0;
        }

        return year * 10 + termRank;
    }

    private Status inferStatusFromPeriod(String period) {
        if (period == null || period.isBlank()) {
            return Status.COMPLETED;
        }
        if ("TRANSFER".equals(period)) {
            return Status.COMPLETED;
        }
        if ("NO_PERIOD".equals(period)) {
            return Status.COMPLETED;
        }

        int coursePeriodRank = periodRank(period);
        int currentPeriodRank = currentPeriodRank(LocalDate.now());

        if (coursePeriodRank == currentPeriodRank) {
            return Status.IN_PROGRESS;
        }
        if (coursePeriodRank < currentPeriodRank) {
            return Status.COMPLETED;
        }
        return Status.UNFULFILLED;
    }

    private int currentPeriodRank(LocalDate now) {
        int month = now.getMonthValue();
        int year = now.getYear();
        int termRank;

        if (month >= 1 && month <= 5) {
            termRank = 1; // SPRING
        } else if (month >= 6 && month <= 8) {
            termRank = 2; // SUMMER
        } else {
            termRank = 3; // FALL
        }

        return year * 10 + termRank;
    }

    private Optional<Major> resolveMajor(String userMajorName) {
        String normalizedInput = normalizeMajorName(userMajorName);
        if (normalizedInput.isBlank()) {
            return Optional.empty();
        }

        Optional<Major> exact = majorRepository.findByName(userMajorName.trim());
        if (exact.isPresent()) {
            return exact;
        }

        Map<String, String> aliases = Map.of(
                "comsci", "computerscience",
                "compsci", "computerscience",
                "cs", "computerscience",
                "se", "softwareengineering");
        String canonical = aliases.getOrDefault(normalizedInput, normalizedInput);

        return majorRepository.findAll().stream()
                .filter(m -> m.getName() != null && !m.getName().isBlank())
                .filter(m -> {
                    String normalizedMajor = normalizeMajorName(m.getName());
                    return normalizedMajor.equals(canonical)
                            || normalizedMajor.contains(canonical)
                            || canonical.contains(normalizedMajor);
                })
                .findFirst();
    }

    private String normalizeMajorName(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    // ----------------------------------------------------------------------
    // DTO RECORDS
    // ----------------------------------------------------------------------
    public record MappedCourse(
            String courseCode,
            String courseName,
            String academicPeriod,
            int credits) {
    }

    public record StudentProgressResult(
            List<MappedCourse> isuCourses,
            List<MappedCourse> transferCourses,
            List<String> unmatchedCourses,
            Integer creditsDefined,
            Integer creditsSatisfying,
            Integer creditsInProgress) {
    }

    public record FlowchartResult(
            List<Course> courses,
            List<String[]> edges,
            List<String> completedCourses,
            Map<String, String> academicPeriods) {
    }
}

package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.major.MajorNotFoundException;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import com.sdmay19.courseflow.semester.Term;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FlowchartService {

    private final CourseRepository courseRepository;
    private final MajorRepository majorRepository;
    private final FlowChartRepository flowChartRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    public FlowchartService(
            FlowChartRepository flowChartRepository,
            SemesterRepository semesterRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            MajorRepository majorRepository) {

        this.flowChartRepository = flowChartRepository;
        this.semesterRepository = semesterRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.majorRepository = majorRepository;
    }

    // ---------------------------------------------------------------------
    // CREATE FROM DTO (existing behavior)
    // ---------------------------------------------------------------------
    public Flowchart createFromDTO(FlowchartDTO dto) {
        Flowchart saved = buildFromDTO(dto);
        return flowChartRepository.save(saved);
    }

    public Flowchart buildFromDTO(FlowchartDTO dto) {
        List<Semester> semesters = getSemesters(dto);
        AppUser user = getUser(dto);
        Major major = getMajor(dto);
        return new Flowchart(
                dto.getTotalCredits(),
                dto.getCreditsSatisfied(),
                dto.getTitle(),
                user,
                semesters,
                dto.getCourseStatusMap(),
                major);
    }

    public List<Semester> getSemesters(FlowchartDTO dto) {
        return semesterRepository.findAllById(dto.getSemesterIdents());
    }

    public AppUser getUser(FlowchartDTO dto) {
        return userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User with id " + dto.getUserId() + " not found"));
    }

    public Major getMajor(FlowchartDTO dto) {
        return majorRepository.findByName(dto.getMajorName())
                .orElseThrow(() -> new MajorNotFoundException("Major with name: " + dto.getMajorName() + " not found"));
    }

    // ---------------------------------------------------------------------
    // NEW: CREATE FLOWCHART FROM PROGRESS (used by importer)
    // ---------------------------------------------------------------------
    /**
     * Creates a new Flowchart for the given user and major, using the
     * courseStatusMap and a grouping of courses by academicPeriod string,
     * e.g. "FALL2022", "SPRING2021", etc.
     *
     * Each academic period becomes a Semester block containing the courses
     * the student took in that period.
     */
    public Flowchart createFromProgress(
            AppUser user,
            Major major,
            Map<String, Status> courseStatusMap,
            Map<String, List<Course>> coursesByAcademicPeriod,
            int totalCredits,
            int satisfiedCredits) {
        return createFromProgress(
                user,
                major,
                courseStatusMap,
                coursesByAcademicPeriod,
                totalCredits,
                satisfiedCredits,
                new HashMap<>(),
                new HashMap<>());
    }

    public Flowchart createFromProgress(
            AppUser user,
            Major major,
            Map<String, Status> courseStatusMap,
            Map<String, List<Course>> coursesByAcademicPeriod,
            int totalCredits,
            int satisfiedCredits,
            Map<String, Integer> requirementRemainingMap,
            Map<String, String> requirementStatusMap) {

        Flowchart flowchart = new Flowchart(
                totalCredits,
                satisfiedCredits,
                "Imported Progress Report",
                user,
                new ArrayList<>(),
                courseStatusMap,
                major);
        flowchart.setRequirementRemainingMap(
                requirementRemainingMap == null ? new HashMap<>() : new HashMap<>(requirementRemainingMap));
        flowchart.setRequirementStatusMap(
                requirementStatusMap == null ? new HashMap<>() : new HashMap<>(requirementStatusMap));

        List<Semester> semesterEntities = new ArrayList<>();

        // Create Semester entities from each academic period key
        // ------------------------------------------------------------
        // MERGE SEMESTERS WITH SAME TERM/YEAR (fix duplicate SPRING 2025)
        // ------------------------------------------------------------
        Map<String, List<Course>> merged = new HashMap<>();

        for (Map.Entry<String, List<Course>> entry : coursesByAcademicPeriod.entrySet()) {
            String period = entry.getKey();
            List<Course> courses = entry.getValue();

            if (period == null || period.isBlank())
                continue;

            // Normalize first → gives us correct YEAR + TERM
            Semester normalized = buildSemesterFromPeriod(
                    period,
                    flowchart,
                    courses,
                    major.getName());

            // Canonical merge key, e.g. "SPRING-2025"
            String mergeKey = normalized.getTerm().name() + "-" + normalized.getYear();

            merged.computeIfAbsent(mergeKey, k -> new ArrayList<>())
                    .addAll(courses);
        }

        // ------------------------------------------------------------
        // Now build actual Semester entities from merged periods
        // ------------------------------------------------------------
        for (Map.Entry<String, List<Course>> entry : merged.entrySet()) {
            String key = entry.getKey(); // e.g. "SPRING-2025"
            List<Course> mergedCourses = entry.getValue();
            Map<String, Course> uniqueByIdent = new LinkedHashMap<>();
            for (Course c : mergedCourses) {
                if (c != null && c.getCourseIdent() != null) {
                    uniqueByIdent.putIfAbsent(c.getCourseIdent(), c);
                }
            }
            List<Course> uniqueMergedCourses = new ArrayList<>(uniqueByIdent.values());

            String[] parts = key.split("-");
            Term term = Term.valueOf(parts[0]);
            int year = Integer.parseInt(parts[1]);

            Semester sem = new Semester(year, term, major.getName(), flowchart, uniqueMergedCourses);
            semesterEntities.add(sem);
        }

        // Sort semesters chronologically
        semesterEntities.sort((a, b) -> {
            int rankA = semesterRank(a.getYear(), a.getTerm());
            int rankB = semesterRank(b.getYear(), b.getTerm());
            return Integer.compare(rankA, rankB);
        });

        flowchart.setSemesters(semesterEntities);

        // Cascade from Flowchart → Semesters will persist them
        return flowChartRepository.save(flowchart);
    }

    private Semester buildSemesterFromPeriod(
            String period,
            Flowchart flowchart,
            List<Course> courses,
            String majorName) {

        String upper = period.toUpperCase(Locale.ROOT);

        // ---------- WINTER SESSION SPECIAL HANDLING ----------
        if (upper.contains("WINTER")) {

            // Extract the SECOND YEAR from a date range:
            // Example: "(12/23/2024-01/17/2025)" → 2025
            int springYear = 0;

            Matcher matcher = Pattern.compile("(\\d{4})\\)").matcher(period);
            if (matcher.find()) {
                springYear = Integer.parseInt(matcher.group(1));
            }

            // Fallback if parsing fails
            if (springYear == 0) {
                springYear = extractYearFallback(period);
            }

            return new Semester(springYear, Term.SPRING, majorName, flowchart, courses);
        }

        // ---------- NORMAL SEMESTER HANDLING ----------
        // Extract year (take last 4-digit year)
        Matcher yearMatcher = Pattern.compile("(\\d{4})").matcher(period);
        int year = 0;
        while (yearMatcher.find()) {
            year = Integer.parseInt(yearMatcher.group(1));
        }

        // Extract term name
        Term term = Term.FALL;
        if (upper.contains("SPRING"))
            term = Term.SPRING;
        else if (upper.contains("SUMMER"))
            term = Term.SUMMER;
        else if (upper.contains("FALL"))
            term = Term.FALL;

        return new Semester(year, term, majorName, flowchart, courses);
    }

    // Fallback if Winter regex fails (should be rare)
    private int extractYearFallback(String period) {
        Matcher yearMatcher = Pattern.compile("(\\d{4})").matcher(period);
        int lastYear = 0;
        while (yearMatcher.find()) {
            lastYear = Integer.parseInt(yearMatcher.group(1));
        }
        return lastYear;
    }

    private int semesterRank(int year, Term term) {
        int base = year * 10;
        int offset = switch (term) {
            case SPRING -> 1;
            case SUMMER -> 2;
            case FALL -> 3;
            default -> 9;
        };
        return base + offset;
    }

    // ---------------------------------------------------------------------
    // READ
    // ---------------------------------------------------------------------
    public Flowchart getById(long id) {
        return flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + id + " not Found."));
    }

    public List<Course> getCourseByStatus(long flowchartId, Status status) {
        Flowchart flowchart = getById(flowchartId);
        Map<String, Status> courseMap = flowchart.getCourseStatusMap();
        List<Course> result = new ArrayList<>();

        for (Map.Entry<String, Status> entry : courseMap.entrySet()) {
            String courseIdent = entry.getKey();
            Status curStatus = entry.getValue();

            if (status == curStatus) {
                Course course = courseRepository.findByCourseIdent(courseIdent)
                        .orElseThrow(
                                () -> new CourseNotFoundException("Course with ident " + courseIdent + " not found."));
                result.add(course);
            }
        }
        return result;
    }

    // ---------------------------------------------------------------------
    // UPDATE
    // ---------------------------------------------------------------------
    public Flowchart update(long id, FlowchartDTO flowchartDTO) {
        Flowchart flowchart = flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id: " + id + " not found."));

        if (flowchartDTO.getMajorName() != null && !flowchartDTO.getMajorName().isEmpty()) {
            Major major = majorRepository.findByName(flowchartDTO.getMajorName())
                    .orElseThrow(() -> new MajorNotFoundException(
                            "Major with " + flowchartDTO.getMajorName() + " not found."));
            flowchart.setMajor(major);
        }
        if (flowchartDTO.getUserId() > 0) {
            AppUser user = userRepository.findById(flowchartDTO.getUserId())
                    .orElseThrow(() -> new UserNotFoundException("User with Id: " + id + " not found."));
            flowchart.setUser(user);
        }
        if (flowchartDTO.getSemesterIdents() != null && !flowchartDTO.getSemesterIdents().isEmpty()) {
            List<Semester> semesters = semesterRepository.findAllById(flowchartDTO.getSemesterIdents());
            if (!semesters.isEmpty()) {
                flowchart.setSemesters(semesters);
            }
        }
        if (flowchartDTO.getTotalCredits() > 0) {
            flowchart.setTotalCredits(flowchartDTO.getTotalCredits());
        }
        if (flowchartDTO.getCreditsSatisfied() > 0) {
            flowchart.setCreditsSatisfied(flowchartDTO.getCreditsSatisfied());
        }
        if (flowchartDTO.getTitle() != null && !flowchartDTO.getTitle().isEmpty()) {
            flowchart.setTitle(flowchartDTO.getTitle());
        }
        if (flowchartDTO.getCourseStatusMap() != null && !flowchartDTO.getCourseStatusMap().isEmpty()) {
            flowchart.setCourseStatusMap(flowchartDTO.getCourseStatusMap());
        }
        return flowchart;
    }

    @Transactional
    public void addCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        Map<String, Status> map = flowchart.getCourseStatusMap();
        if (map.containsKey(ident)) {
            throw new IllegalArgumentException("Course already mapped in flowchart");
        }
        map.put(ident, status);
    }

    @Transactional
    public void removeCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in map");
        }
        map.remove(ident);
    }

    @Transactional
    public void updateCourseStatus(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in status map");
        }
        map.put(ident, status);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public Flowchart getByUser(AppUser user) {
        List<Flowchart> userFlowcharts = new ArrayList<>(flowChartRepository.findAllByUser(user));
        if (userFlowcharts.isEmpty()) {
            throw new FlowchartNotFoundException("Flowchart with user not found");
        }

        userFlowcharts.sort((a, b) -> Long.compare(b.getId(), a.getId()));

        Flowchart selected = userFlowcharts.get(0);
        for (Flowchart fc : userFlowcharts) {
            List<Semester> sems = fc.getSemesters();
            if (sems != null && !sems.isEmpty()) {
                selected = fc;
                break;
            }
        }

        // Force initialize collections so API response includes renderable data.
        if (selected.getCourseStatusMap() != null) {
            selected.getCourseStatusMap().size();
        }
        if (selected.getSemesters() != null) {
            selected.getSemesters().size();
            for (Semester sem : selected.getSemesters()) {
                if (sem.getCourses() != null) {
                    sem.getCourses().size();
                }
            }
        }

        return selected;
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public Flowchart getByUserId(long userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with id " + userId + " not found"));
        return getByUser(user);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public FlowchartInsightsResponse getInsightsByUser(AppUser user) {
        Flowchart flowchart = getByUser(user);
        return buildInsights(flowchart);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public FlowchartInsightsResponse getInsightsByUserId(long userId) {
        Flowchart flowchart = getByUserId(userId);
        return buildInsights(flowchart);
    }

    public FlowchartInsightsResponse buildInsights(Flowchart flowchart) {
        int completedCredits = Math.max(0, flowchart.getCreditsSatisfied());
        int totalCredits = Math.max(0, flowchart.getTotalCredits());

        Set<String> countedInProgress = new HashSet<>();
        int inProgressCredits = 0;
        int inProgressCourseCount = 0;

        List<Semester> semesters = flowchart.getSemesters() == null ? List.of() : flowchart.getSemesters();
        for (Semester semester : semesters) {
            List<Course> courses = semester.getCourses() == null ? List.of() : semester.getCourses();
            for (Course course : courses) {
                if (course == null || course.getCourseIdent() == null) {
                    continue;
                }
                String ident = normalizeCourseIdent(course.getCourseIdent());
                if (ident.isBlank() || countedInProgress.contains(ident)) {
                    continue;
                }
                Status status = getStatusForCourse(flowchart.getCourseStatusMap(), course.getCourseIdent());
                if (status == Status.IN_PROGRESS) {
                    countedInProgress.add(ident);
                    inProgressCourseCount++;
                    inProgressCredits += Math.max(0, course.getCredits());
                }
            }
        }

        int appliedCredits = completedCredits + inProgressCredits;
        int remainingCredits = Math.max(0, totalCredits - appliedCredits);
        int unfulfilledCourseCount = countStatus(flowchart.getCourseStatusMap(), Status.UNFULFILLED);

        int avgCompletedCreditsPerTerm = estimateCompletedCreditsPerTerm(flowchart);
        int estimatedTermsToGraduate = remainingCredits == 0
                ? 0
                : (int) Math.ceil((double) remainingCredits / Math.max(1, avgCompletedCreditsPerTerm));
        String projectedGraduationTerm = projectGraduationTerm(flowchart, estimatedTermsToGraduate);

        List<String> riskFlags = new ArrayList<>();
        if (inProgressCredits == 0 && remainingCredits > 0) {
            riskFlags.add("No in-progress credits are currently mapped.");
        }
        if (inProgressCredits > 18) {
            riskFlags.add("In-progress load is above 18 credits.");
        }
        if (estimatedTermsToGraduate > 8) {
            riskFlags.add("Projected graduation is more than 8 terms away.");
        }
        if (unfulfilledCourseCount > 12) {
            riskFlags.add("Large number of unfulfilled courses remain.");
        }

        return new FlowchartInsightsResponse(
                completedCredits,
                inProgressCredits,
                appliedCredits,
                totalCredits,
                remainingCredits,
                inProgressCourseCount,
                unfulfilledCourseCount,
                estimatedTermsToGraduate,
                projectedGraduationTerm,
                riskFlags);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public FlowchartRequirementCoverageResponse getRequirementCoverageByUser(AppUser user) {
        Flowchart flowchart = getByUser(user);
        return buildRequirementCoverage(flowchart);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public FlowchartRequirementCoverageResponse getRequirementCoverageByUserId(long userId) {
        Flowchart flowchart = getByUserId(userId);
        return buildRequirementCoverage(flowchart);
    }

    public FlowchartRequirementCoverageResponse buildRequirementCoverage(Flowchart flowchart) {
        Major major = flowchart.getMajor();
        List<DegreeRequirement> degreeRequirements = major == null || major.getDegreeRequirements() == null
                ? List.of()
                : major.getDegreeRequirements();

        List<FlowchartRequirementCoverageResponse.RequirementCoverageItem> items = new ArrayList<>();

        for (DegreeRequirement requirement : degreeRequirements) {
            if (requirement == null) {
                continue;
            }

            Map<String, Course> requirementCourses = new LinkedHashMap<>();

            if (requirement.getCourses() != null) {
                for (Course course : requirement.getCourses()) {
                    addRequirementCourse(requirementCourses, course);
                }
            }
            int completedCredits = 0;
            int inProgressCredits = 0;
            List<String> completedCourses = new ArrayList<>();
            List<String> inProgressCourses = new ArrayList<>();
            Set<String> countedCourses = new HashSet<>();

            for (Course course : requirementCourses.values()) {
                String normalized = normalizeCourseIdent(course.getCourseIdent());
                if (normalized.isBlank() || countedCourses.contains(normalized)) {
                    continue;
                }
                Status status = getStatusForCourse(flowchart.getCourseStatusMap(), course.getCourseIdent());
                if (status == Status.COMPLETED) {
                    completedCredits += Math.max(0, course.getCredits());
                    completedCourses.add(course.getCourseIdent());
                    countedCourses.add(normalized);
                } else if (status == Status.IN_PROGRESS) {
                    inProgressCredits += Math.max(0, course.getCredits());
                    inProgressCourses.add(course.getCourseIdent());
                    countedCourses.add(normalized);
                }
            }

            // Apply requirement-group credit caps so electives/groups do not overcount.
            if (requirement.getRequirementGroups() != null) {
                for (RequirementGroup group : requirement.getRequirementGroups()) {
                    if (group == null || group.getCourses() == null || group.getCourses().isEmpty()) {
                        continue;
                    }
                    int groupRequired = group.getSatisfyingCredits();
                    if (groupRequired <= 0) {
                        groupRequired = group.getCourses().stream().mapToInt(c -> Math.max(0, c.getCredits())).sum();
                    }

                    int groupCompleted = 0;
                    int groupInProgress = 0;
                    List<String> groupCompletedCourses = new ArrayList<>();
                    List<String> groupInProgressCourses = new ArrayList<>();

                    for (Course course : group.getCourses()) {
                        if (course == null || course.getCourseIdent() == null) {
                            continue;
                        }
                        String normalized = normalizeCourseIdent(course.getCourseIdent());
                        if (normalized.isBlank() || countedCourses.contains(normalized)) {
                            continue;
                        }
                        Status status = getStatusForCourse(flowchart.getCourseStatusMap(), course.getCourseIdent());
                        if (status == Status.COMPLETED) {
                            groupCompleted += Math.max(0, course.getCredits());
                            groupCompletedCourses.add(course.getCourseIdent());
                        } else if (status == Status.IN_PROGRESS) {
                            groupInProgress += Math.max(0, course.getCredits());
                            groupInProgressCourses.add(course.getCourseIdent());
                        }
                    }

                    int completedUsed = Math.min(groupCompleted, groupRequired);
                    int inProgressUsed = Math.min(groupInProgress, Math.max(0, groupRequired - completedUsed));

                    if (completedUsed > 0) {
                        completedCredits += completedUsed;
                        for (String ident : groupCompletedCourses) {
                            countedCourses.add(normalizeCourseIdent(ident));
                            completedCourses.add(ident);
                        }
                    }
                    if (inProgressUsed > 0) {
                        inProgressCredits += inProgressUsed;
                        for (String ident : groupInProgressCourses) {
                            countedCourses.add(normalizeCourseIdent(ident));
                            inProgressCourses.add(ident);
                        }
                    }
                }
            }

            int requiredCredits = requirement.getSatisfyingCredits();
            if (requiredCredits <= 0) {
                int directRequired = requirementCourses.values().stream().mapToInt(c -> Math.max(0, c.getCredits())).sum();
                int groupRequired = 0;
                if (requirement.getRequirementGroups() != null) {
                    for (RequirementGroup group : requirement.getRequirementGroups()) {
                        if (group == null) {
                            continue;
                        }
                        if (group.getSatisfyingCredits() > 0) {
                            groupRequired += group.getSatisfyingCredits();
                        } else if (group.getCourses() != null) {
                            groupRequired += group.getCourses().stream().mapToInt(c -> Math.max(0, c.getCredits())).sum();
                        }
                    }
                }
                requiredCredits = directRequired + groupRequired;
            }

            int appliedCredits = Math.min(requiredCredits, completedCredits + inProgressCredits);
            int remainingCredits = Math.max(0, requiredCredits - appliedCredits);

            String status;
            if (completedCredits >= requiredCredits) {
                status = "SATISFIED";
            } else if (appliedCredits > 0) {
                status = "IN_PROGRESS";
            } else {
                status = "UNMET";
            }

            items.add(new FlowchartRequirementCoverageResponse.RequirementCoverageItem(
                    requirement.getName(),
                    requiredCredits,
                    completedCredits,
                    inProgressCredits,
                    remainingCredits,
                    status,
                    completedCourses,
                    inProgressCourses));
        }

        items.sort((a, b) -> {
            int statusDiff = Integer.compare(requirementStatusRank(a.getStatus()), requirementStatusRank(b.getStatus()));
            if (statusDiff != 0) {
                return statusDiff;
            }
            return Integer.compare(b.getRemainingCredits(), a.getRemainingCredits());
        });

        int satisfied = 0;
        int inProgress = 0;
        int unmet = 0;
        for (FlowchartRequirementCoverageResponse.RequirementCoverageItem item : items) {
            if ("SATISFIED".equals(item.getStatus())) {
                satisfied++;
            } else if ("IN_PROGRESS".equals(item.getStatus())) {
                inProgress++;
            } else {
                unmet++;
            }
        }

        return new FlowchartRequirementCoverageResponse(
                items.size(),
                satisfied,
                inProgress,
                unmet,
                items);
    }

    // ---------------------------------------------------------------------
    // DELETE
    // ---------------------------------------------------------------------
    @Transactional
    public void deleteById(long id) {
        Flowchart flowchart = flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + id + " not found."));

        // Clear semesters (orphans will be removed)
        List<Semester> sems = flowchart.getSemesters();
        if (sems != null) {
            sems.clear();
            flowchart.setSemesters(sems);
        }

        // Clear courseStatusMap
        Map<String, Status> map = flowchart.getCourseStatusMap();
        if (map != null) {
            map.clear();
            flowchart.setCourseStatusMap(map);
        }

        // Save the cleared entity
        flowChartRepository.save(flowchart);

        // Now safe to delete
        flowChartRepository.deleteById(id);
    }

    public List<Flowchart> getAll() {
        return flowChartRepository.findAll();
    }

    private String normalizeCourseIdent(String ident) {
        if (ident == null) {
            return "";
        }
        return ident.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private Status getStatusForCourse(Map<String, Status> statusMap, String courseIdent) {
        if (statusMap == null || statusMap.isEmpty()) {
            return null;
        }

        String normalizedTarget = normalizeCourseIdent(courseIdent);
        for (Map.Entry<String, Status> entry : statusMap.entrySet()) {
            if (normalizeCourseIdent(entry.getKey()).equals(normalizedTarget)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private int countStatus(Map<String, Status> statusMap, Status target) {
        if (statusMap == null || statusMap.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (Status status : statusMap.values()) {
            if (status == target) {
                count++;
            }
        }
        return count;
    }

    private int estimateCompletedCreditsPerTerm(Flowchart flowchart) {
        Map<String, Integer> completedByTerm = new HashMap<>();
        List<Semester> semesters = flowchart.getSemesters() == null ? List.of() : flowchart.getSemesters();
        for (Semester semester : semesters) {
            List<Course> courses = semester.getCourses() == null ? List.of() : semester.getCourses();
            int completedCredits = 0;
            for (Course course : courses) {
                if (course == null || course.getCourseIdent() == null) {
                    continue;
                }
                Status status = getStatusForCourse(flowchart.getCourseStatusMap(), course.getCourseIdent());
                if (status == Status.COMPLETED) {
                    completedCredits += Math.max(0, course.getCredits());
                }
            }
            if (completedCredits > 0) {
                String termKey = semester.getYear() + "-" + (semester.getTerm() == null ? "UNKNOWN" : semester.getTerm().name());
                completedByTerm.put(termKey, completedCredits);
            }
        }

        if (completedByTerm.isEmpty()) {
            return 15;
        }
        int total = 0;
        for (Integer credits : completedByTerm.values()) {
            total += credits;
        }
        return Math.max(1, total / completedByTerm.size());
    }

    private String projectGraduationTerm(Flowchart flowchart, int termsToAdd) {
        Semester base = latestSemester(flowchart);
        int year = base == null ? LocalDate.now().getYear() : base.getYear();
        Term term = base == null ? inferCurrentTerm(LocalDate.now().getMonthValue()) : base.getTerm();
        if (term == null) {
            term = inferCurrentTerm(LocalDate.now().getMonthValue());
        }

        for (int i = 0; i < termsToAdd; i++) {
            if (term == Term.SPRING) {
                term = Term.SUMMER;
            } else if (term == Term.SUMMER) {
                term = Term.FALL;
            } else {
                term = Term.SPRING;
                year += 1;
            }
        }
        return term.name() + " " + year;
    }

    private Semester latestSemester(Flowchart flowchart) {
        List<Semester> semesters = flowchart.getSemesters();
        if (semesters == null || semesters.isEmpty()) {
            return null;
        }
        Semester latest = null;
        int bestRank = Integer.MIN_VALUE;
        for (Semester semester : semesters) {
            if (semester == null || semester.getYear() <= 0 || semester.getTerm() == null) {
                continue;
            }
            int rank = semesterRank(semester.getYear(), semester.getTerm());
            if (rank > bestRank) {
                bestRank = rank;
                latest = semester;
            }
        }
        return latest;
    }

    private Term inferCurrentTerm(int month) {
        if (month <= 5) {
            return Term.SPRING;
        }
        if (month <= 8) {
            return Term.SUMMER;
        }
        return Term.FALL;
    }

    private void addRequirementCourse(Map<String, Course> map, Course course) {
        if (course == null || course.getCourseIdent() == null) {
            return;
        }
        String normalized = normalizeCourseIdent(course.getCourseIdent());
        if (!normalized.isBlank()) {
            map.putIfAbsent(normalized, course);
        }
    }

    private int requirementStatusRank(String status) {
        if ("UNMET".equals(status)) {
            return 0;
        }
        if ("IN_PROGRESS".equals(status)) {
            return 1;
        }
        return 2;
    }
}

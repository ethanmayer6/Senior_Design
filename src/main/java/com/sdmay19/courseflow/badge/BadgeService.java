package com.sdmay19.courseflow.badge;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartInsightsResponse;
import com.sdmay19.courseflow.flowchart.FlowchartRequirementCoverageResponse;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.Term;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class BadgeService {

    private enum BadgeRarity {
        COMMON, RARE, EPIC, LEGENDARY
    }

    private record CompletedCourseMeta(
            Course course,
            int semesterRank,
            String completedTerm,
            String department,
            int levelDigit,
            BadgeRarity rarity,
            int xp) {
    }

    private record BadgeComputation(
            List<CompletedCourseMeta> completedCourseMeta,
            List<BadgeGamificationResponse.BadgeCard> badgeCards,
            BadgeGamificationResponse.RarityBreakdown rarityBreakdown,
            Map<String, Integer> trackedDepartmentCounts) {
    }

    private final FlowchartService flowchartService;

    public BadgeService(FlowchartService flowchartService) {
        this.flowchartService = flowchartService;
    }

    public List<Course> getCompletedBadges(AppUser user) {
        try {
            Flowchart flowchart = flowchartService.getByUser(user);
            BadgeComputation computation = computeBadges(flowchart);
            return computation.completedCourseMeta().stream().map(CompletedCourseMeta::course).toList();
        } catch (FlowchartNotFoundException ex) {
            return List.of();
        }
    }

    public BadgeGamificationResponse getGamification(AppUser user) {
        try {
            Flowchart flowchart = flowchartService.getByUser(user);
            BadgeComputation computation = computeBadges(flowchart);
            FlowchartInsightsResponse insights = flowchartService.buildInsights(flowchart);
            FlowchartRequirementCoverageResponse coverage = flowchartService.buildRequirementCoverage(flowchart);
            return buildGamificationResponse(computation, insights, coverage);
        } catch (FlowchartNotFoundException ex) {
            BadgeComputation empty = new BadgeComputation(
                    List.of(),
                    List.of(),
                    new BadgeGamificationResponse.RarityBreakdown(0, 0, 0, 0),
                    Map.of());
            return buildGamificationResponse(empty, null, null);
        }
    }

    private BadgeGamificationResponse buildGamificationResponse(
            BadgeComputation computation,
            FlowchartInsightsResponse insights,
            FlowchartRequirementCoverageResponse coverage) {

        int totalXp = computation.badgeCards().stream().mapToInt(BadgeGamificationResponse.BadgeCard::xp).sum();
        int level = Math.max(1, (int) Math.floor(Math.sqrt(totalXp / 450.0)) + 1);
        int currentLevelXpFloor = xpRequirementForLevel(level);
        int nextLevelXpFloor = xpRequirementForLevel(level + 1);
        int levelSpan = Math.max(1, nextLevelXpFloor - currentLevelXpFloor);
        int xpIntoLevel = Math.max(0, totalXp - currentLevelXpFloor);
        int xpToNextLevel = Math.max(0, nextLevelXpFloor - totalXp);
        int levelProgressPercent = percent(xpIntoLevel, levelSpan);

        List<BadgeGamificationResponse.QuestCard> quests = buildQuests(
                level,
                xpIntoLevel,
                levelSpan,
                xpToNextLevel,
                computation.rarityBreakdown(),
                insights,
                coverage);

        int completedQuestCount = (int) quests.stream()
                .filter(BadgeGamificationResponse.QuestCard::completed)
                .count();

        int appliedCredits = insights == null ? 0 : insights.getAppliedCredits();
        int totalCredits = insights == null ? 0 : insights.getTotalCredits();
        int remainingCredits = insights == null ? 0 : insights.getRemainingCredits();
        String projectedGraduationTerm = insights == null ? null : insights.getProjectedGraduationTerm();

        BadgeGamificationResponse.Summary summary = new BadgeGamificationResponse.Summary(
                computation.badgeCards().size(),
                totalXp,
                level,
                levelTitle(level),
                xpIntoLevel,
                levelSpan,
                xpToNextLevel,
                levelProgressPercent,
                completedQuestCount,
                quests.size(),
                appliedCredits,
                totalCredits,
                remainingCredits,
                projectedGraduationTerm);

        BadgeGamificationResponse.BadgeCard spotlight = computation.badgeCards().isEmpty()
                ? null
                : computation.badgeCards().get(0);

        List<BadgeGamificationResponse.DepartmentCollection> collections = buildCollections(
                computation.badgeCards(),
                computation.trackedDepartmentCounts());

        return new BadgeGamificationResponse(
                summary,
                computation.rarityBreakdown(),
                spotlight,
                computation.badgeCards(),
                quests,
                collections);
    }

    private List<BadgeGamificationResponse.QuestCard> buildQuests(
            int level,
            int xpIntoLevel,
            int levelSpan,
            int xpToNextLevel,
            BadgeGamificationResponse.RarityBreakdown rarityBreakdown,
            FlowchartInsightsResponse insights,
            FlowchartRequirementCoverageResponse coverage) {
        List<BadgeGamificationResponse.QuestCard> quests = new ArrayList<>();

        String levelDescription = xpToNextLevel > 0
                ? "Earn " + xpToNextLevel + " XP from completed courses to level up."
                : "You are ready to level up on your next completion.";
        quests.add(createQuest(
                "level",
                "Reach Level " + (level + 1),
                levelDescription,
                xpIntoLevel,
                levelSpan,
                levelTitle(level + 1) + " title"));

        if (insights != null && insights.getTotalCredits() > 0) {
            quests.add(createQuest(
                    "credits",
                    "Close Out Degree Credits",
                    Math.max(0, insights.getRemainingCredits()) + " credits remaining to graduation target.",
                    insights.getAppliedCredits(),
                    insights.getTotalCredits(),
                    "Capstone Crown badge"));
        } else {
            int rarePlus = rarityBreakdown.rare() + rarityBreakdown.epic() + rarityBreakdown.legendary();
            quests.add(createQuest(
                    "rare",
                    "Collect Rare+ Badges",
                    "Complete higher-level courses to increase rarity score.",
                    rarePlus,
                    6,
                    "+500 XP bonus"));
        }

        if (coverage != null && coverage.getTotalRequirements() > 0) {
            int metOrInProgress = coverage.getSatisfiedRequirements() + coverage.getInProgressRequirements();
            quests.add(createQuest(
                    "requirements",
                    "Requirement Coverage Push",
                    coverage.getUnmetRequirements() + " requirement(s) still fully unmet.",
                    metOrInProgress,
                    coverage.getTotalRequirements(),
                    "Degree Master ribbon"));
        } else {
            quests.add(createQuest(
                    "legendary",
                    "Legendary Hunt",
                    "Unlock 2 legendary badges from 4000-level courses.",
                    rarityBreakdown.legendary(),
                    2,
                    "Legend vault frame"));
        }

        return quests;
    }

    private BadgeGamificationResponse.QuestCard createQuest(
            String id,
            String title,
            String description,
            int progress,
            int goal,
            String reward) {
        int safeGoal = Math.max(1, goal);
        int safeProgress = Math.max(0, progress);
        return new BadgeGamificationResponse.QuestCard(
                id,
                title,
                description,
                safeProgress,
                safeGoal,
                reward,
                safeProgress >= safeGoal);
    }

    private List<BadgeGamificationResponse.DepartmentCollection> buildCollections(
            List<BadgeGamificationResponse.BadgeCard> badges,
            Map<String, Integer> trackedDepartmentCounts) {
        Map<String, Integer> completedByDepartment = new HashMap<>();
        for (BadgeGamificationResponse.BadgeCard badge : badges) {
            String department = normalizeDepartment(badge.department());
            completedByDepartment.merge(department, 1, Integer::sum);
        }

        Set<String> departments = new LinkedHashSet<>();
        departments.addAll(trackedDepartmentCounts.keySet());
        departments.addAll(completedByDepartment.keySet());

        List<BadgeGamificationResponse.DepartmentCollection> collections = new ArrayList<>();
        for (String department : departments) {
            int completed = completedByDepartment.getOrDefault(department, 0);
            int tracked = trackedDepartmentCounts.getOrDefault(department, completed);
            int total = Math.max(Math.max(completed, tracked), 1);
            collections.add(new BadgeGamificationResponse.DepartmentCollection(
                    department,
                    completed,
                    total,
                    percent(completed, total)));
        }

        collections.sort((a, b) -> {
            if (a.completed() != b.completed()) {
                return Integer.compare(b.completed(), a.completed());
            }
            return a.department().compareTo(b.department());
        });

        return collections;
    }

    private BadgeComputation computeBadges(Flowchart flowchart) {
        Map<String, Status> statusLookup = buildNormalizedStatusLookup(flowchart.getCourseStatusMap());
        Map<String, CompletedCourseMeta> completedByIdent = new LinkedHashMap<>();
        Map<String, Integer> trackedDepartmentCounts = new HashMap<>();

        if (flowchart.getCourseStatusMap() != null) {
            for (String courseIdent : flowchart.getCourseStatusMap().keySet()) {
                String department = departmentFromCourseIdent(courseIdent);
                trackedDepartmentCounts.merge(department, 1, Integer::sum);
            }
        }

        List<Semester> semesters = flowchart.getSemesters() == null ? List.of() : flowchart.getSemesters();
        for (Semester semester : semesters) {
            if (semester == null || semester.getCourses() == null) {
                continue;
            }
            int rank = semesterRank(semester);
            String completedTerm = completedTermLabel(semester);

            for (Course course : semester.getCourses()) {
                if (course == null || course.getCourseIdent() == null) {
                    continue;
                }

                String normalizedIdent = normalizeCourseIdent(course.getCourseIdent());
                if (normalizedIdent.isBlank()) {
                    continue;
                }

                Status status = statusLookup.get(normalizedIdent);
                if (status != Status.COMPLETED) {
                    continue;
                }

                String department = departmentFromCourseIdent(course.getCourseIdent());
                int levelDigit = levelDigitFromCourseIdent(course.getCourseIdent());
                BadgeRarity rarity = rarityFromLevel(levelDigit);
                int xp = xpForCourse(course.getCredits(), levelDigit);

                CompletedCourseMeta current = new CompletedCourseMeta(
                        course,
                        rank,
                        completedTerm,
                        department,
                        levelDigit,
                        rarity,
                        xp);
                CompletedCourseMeta existing = completedByIdent.get(normalizedIdent);
                if (existing == null || current.semesterRank() > existing.semesterRank()) {
                    completedByIdent.put(normalizedIdent, current);
                }
            }
        }

        List<CompletedCourseMeta> completedMeta = new ArrayList<>(completedByIdent.values());
        completedMeta.sort((a, b) -> {
            if (a.semesterRank() != b.semesterRank()) {
                return Integer.compare(b.semesterRank(), a.semesterRank());
            }
            int rarityDiff = Integer.compare(rarityScore(b.rarity()), rarityScore(a.rarity()));
            if (rarityDiff != 0) {
                return rarityDiff;
            }
            return safeCourseIdent(a.course()).compareTo(safeCourseIdent(b.course()));
        });

        Set<Integer> recentRanks = new LinkedHashSet<>();
        completedMeta.stream()
                .map(CompletedCourseMeta::semesterRank)
                .filter(rank -> rank > 0)
                .sorted(Comparator.reverseOrder())
                .forEach(rank -> {
                    if (recentRanks.size() < 2) {
                        recentRanks.add(rank);
                    }
                });

        List<BadgeGamificationResponse.BadgeCard> cards = new ArrayList<>();
        int common = 0;
        int rare = 0;
        int epic = 0;
        int legendary = 0;

        for (CompletedCourseMeta meta : completedMeta) {
            boolean isRecent = recentRanks.contains(meta.semesterRank());

            cards.add(new BadgeGamificationResponse.BadgeCard(
                    meta.course().getId(),
                    meta.course().getName(),
                    meta.course().getCourseIdent(),
                    meta.course().getCredits(),
                    meta.course().getDescription(),
                    meta.course().getOffered(),
                    meta.course().getHours(),
                    meta.department(),
                    meta.levelDigit(),
                    meta.rarity().name(),
                    meta.xp(),
                    meta.semesterRank(),
                    meta.completedTerm(),
                    isRecent));

            switch (meta.rarity()) {
                case COMMON -> common++;
                case RARE -> rare++;
                case EPIC -> epic++;
                case LEGENDARY -> legendary++;
            }
        }

        return new BadgeComputation(
                completedMeta,
                cards,
                new BadgeGamificationResponse.RarityBreakdown(common, rare, epic, legendary),
                trackedDepartmentCounts);
    }

    private Map<String, Status> buildNormalizedStatusLookup(Map<String, Status> rawStatusMap) {
        Map<String, Status> lookup = new HashMap<>();
        if (rawStatusMap == null || rawStatusMap.isEmpty()) {
            return lookup;
        }

        for (Map.Entry<String, Status> entry : rawStatusMap.entrySet()) {
            String normalizedIdent = normalizeCourseIdent(entry.getKey());
            if (normalizedIdent.isBlank()) {
                continue;
            }
            lookup.put(normalizedIdent, entry.getValue());
        }
        return lookup;
    }

    private String normalizeCourseIdent(String value) {
        if (value == null) {
            return "";
        }
        return value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private String normalizeDepartment(String value) {
        if (value == null || value.isBlank()) {
            return "MISC";
        }
        String normalized = value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return normalized.isBlank() ? "MISC" : normalized;
    }

    private String departmentFromCourseIdent(String courseIdent) {
        if (courseIdent == null || courseIdent.isBlank()) {
            return "MISC";
        }
        String normalized = courseIdent.trim().toUpperCase(Locale.ROOT).replace(" ", "_");
        String[] parts = normalized.split("_");
        String department = parts.length > 0 ? parts[0] : "MISC";
        return normalizeDepartment(department);
    }

    private int levelDigitFromCourseIdent(String courseIdent) {
        if (courseIdent == null || courseIdent.isBlank()) {
            return 1;
        }
        String normalized = courseIdent.trim().toUpperCase(Locale.ROOT).replace(" ", "_");
        String[] parts = normalized.split("_");
        String numberPart = parts.length > 1 ? parts[1] : normalized.replaceAll("[^0-9]", "");
        String digits = numberPart.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return 1;
        }
        int digit = Character.digit(digits.charAt(0), 10);
        return digit > 0 ? digit : 1;
    }

    private BadgeRarity rarityFromLevel(int levelDigit) {
        if (levelDigit >= 4) {
            return BadgeRarity.LEGENDARY;
        }
        if (levelDigit == 3) {
            return BadgeRarity.EPIC;
        }
        if (levelDigit == 2) {
            return BadgeRarity.RARE;
        }
        return BadgeRarity.COMMON;
    }

    private int rarityScore(BadgeRarity rarity) {
        if (rarity == BadgeRarity.LEGENDARY) {
            return 3;
        }
        if (rarity == BadgeRarity.EPIC) {
            return 2;
        }
        if (rarity == BadgeRarity.RARE) {
            return 1;
        }
        return 0;
    }

    private int xpForCourse(int credits, int levelDigit) {
        int safeCredits = Math.max(1, credits);
        double multiplier = 1.0;
        if (levelDigit == 2) {
            multiplier = 1.2;
        } else if (levelDigit == 3) {
            multiplier = 1.45;
        } else if (levelDigit >= 4) {
            multiplier = 1.75;
        }
        return (int) Math.round(safeCredits * 100 * multiplier);
    }

    private int xpRequirementForLevel(int level) {
        int safeLevel = Math.max(1, level);
        int n = safeLevel - 1;
        return n * n * 450;
    }

    private int percent(int progress, int goal) {
        if (goal <= 0) {
            return 0;
        }
        int value = (int) Math.round((progress / (double) goal) * 100.0);
        return Math.max(0, Math.min(100, value));
    }

    private String levelTitle(int level) {
        if (level >= 20) {
            return "Grand Architect";
        }
        if (level >= 14) {
            return "Degree Vanguard";
        }
        if (level >= 9) {
            return "Plan Strategist";
        }
        if (level >= 5) {
            return "Roadmap Builder";
        }
        return "First-Year Navigator";
    }

    private int semesterRank(Semester semester) {
        if (semester == null || semester.getYear() <= 0) {
            return -1;
        }
        Term term = semester.getTerm();
        int termRank;
        if (term == Term.WINTER) {
            termRank = 0;
        } else if (term == Term.SPRING) {
            termRank = 1;
        } else if (term == Term.SUMMER) {
            termRank = 2;
        } else if (term == Term.FALL) {
            termRank = 3;
        } else {
            termRank = 9;
        }
        return semester.getYear() * 10 + termRank;
    }

    private String completedTermLabel(Semester semester) {
        if (semester == null) {
            return "UNKNOWN";
        }
        if (semester.getYear() <= 0) {
            return "TRANSFER";
        }
        if (semester.getTerm() == null) {
            return String.valueOf(semester.getYear());
        }
        return semester.getTerm().name() + " " + semester.getYear();
    }

    private String safeCourseIdent(Course course) {
        if (course == null || course.getCourseIdent() == null) {
            return "";
        }
        return course.getCourseIdent();
    }
}

package com.sdmay19.courseflow.badge;

import java.util.List;

public record BadgeGamificationResponse(
        Summary summary,
        RarityBreakdown rarityBreakdown,
        BadgeCard spotlight,
        List<BadgeCard> badges,
        List<QuestCard> quests,
        List<DepartmentCollection> collections) {

    public record Summary(
            int totalBadges,
            int totalXp,
            int level,
            String levelTitle,
            int xpIntoLevel,
            int xpLevelSpan,
            int xpToNextLevel,
            int levelProgressPercent,
            int completedQuestCount,
            int totalQuestCount,
            int appliedCredits,
            int totalCredits,
            int remainingCredits,
            String projectedGraduationTerm) {
    }

    public record RarityBreakdown(
            int common,
            int rare,
            int epic,
            int legendary) {
    }

    public record BadgeCard(
            long courseId,
            String name,
            String courseIdent,
            int credits,
            String description,
            String offered,
            String hours,
            String department,
            int levelDigit,
            String rarity,
            int xp,
            int semesterRank,
            String completedTerm,
            boolean recent) {
    }

    public record QuestCard(
            String id,
            String title,
            String description,
            int progress,
            int goal,
            String reward,
            boolean completed) {
    }

    public record DepartmentCollection(
            String department,
            int completed,
            int tracked,
            int progressPercent) {
    }
}

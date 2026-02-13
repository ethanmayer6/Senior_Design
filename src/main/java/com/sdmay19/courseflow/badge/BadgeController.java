package com.sdmay19.courseflow.badge;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/badges")
public class BadgeController {
    private final BadgeService badgeService;

    public BadgeController(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    @GetMapping("/me")
    public List<Course> getCompletedBadges(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return badgeService.getCompletedBadges(user);
    }

    @GetMapping("/me/gamification")
    public BadgeGamificationResponse getMyBadgeGamification(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        return badgeService.getGamification(user);
    }
}

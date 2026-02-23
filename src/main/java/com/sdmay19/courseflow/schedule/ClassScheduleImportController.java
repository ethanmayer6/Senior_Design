package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.semester.Term;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/class-schedule")
public class ClassScheduleImportController {

    private final ClassScheduleImportService importService;

    public ClassScheduleImportController(ClassScheduleImportService importService) {
        this.importService = importService;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importSchedule(@RequestParam("file") MultipartFile file, Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof AppUser user)) {
            return ResponseEntity.status(401).body("Authentication required.");
        }
        try {
            ClassScheduleImportService.ImportResult result = importService.importSchedule(file, user);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to import class schedule: " + e.getMessage());
        }
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof AppUser user)) {
            return ResponseEntity.status(401).body("Authentication required.");
        }
        List<ClassScheduleEntryResponse> response = importService.getCurrentTermEntries(user).stream()
                .map(ClassScheduleEntryResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/term")
    public ResponseEntity<?> getByTerm(
            Authentication auth,
            @RequestParam("year") int year,
            @RequestParam("term") String term) {
        if (auth == null || !(auth.getPrincipal() instanceof AppUser user)) {
            return ResponseEntity.status(401).body("Authentication required.");
        }
        Term parsedTerm;
        try {
            parsedTerm = Term.valueOf(term.trim().toUpperCase());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Invalid term. Use SPRING, SUMMER, FALL, or WINTER.");
        }
        List<ClassScheduleEntryResponse> response = importService.getTermEntries(user, year, parsedTerm).stream()
                .map(ClassScheduleEntryResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    public record ClassScheduleEntryResponse(
            long id,
            String courseIdent,
            String sectionCode,
            String courseTitle,
            String academicPeriodLabel,
            int year,
            String term,
            String termStartDate,
            String termEndDate,
            String meetingPatternRaw,
            String meetingDays,
            String meetingStartTime,
            String meetingEndTime,
            String freeDropDeadline,
            String withdrawDeadline,
            String instructor,
            String deliveryMode,
            String locations,
            String instructionalFormat,
            Integer credits,
            String catalogName) {

        static ClassScheduleEntryResponse from(ClassScheduleEntry entry) {
            Integer credits = entry.getCourse() == null ? null : entry.getCourse().getCredits();
            String catalogName = entry.getCourse() == null ? null : entry.getCourse().getName();
            return new ClassScheduleEntryResponse(
                    entry.getId(),
                    entry.getCourseIdent(),
                    entry.getSectionCode(),
                    entry.getCourseTitle(),
                    entry.getAcademicPeriodLabel(),
                    entry.getYear(),
                    entry.getTerm() == null ? null : entry.getTerm().name(),
                    entry.getTermStartDate() == null ? null : entry.getTermStartDate().toString(),
                    entry.getTermEndDate() == null ? null : entry.getTermEndDate().toString(),
                    entry.getMeetingPatternRaw(),
                    entry.getMeetingDays(),
                    entry.getMeetingStartTime() == null ? null : entry.getMeetingStartTime().toString(),
                    entry.getMeetingEndTime() == null ? null : entry.getMeetingEndTime().toString(),
                    entry.getFreeDropDeadline() == null ? null : entry.getFreeDropDeadline().toString(),
                    entry.getWithdrawDeadline() == null ? null : entry.getWithdrawDeadline().toString(),
                    entry.getInstructor(),
                    entry.getDeliveryMode(),
                    entry.getLocations(),
                    entry.getInstructionalFormat(),
                    credits,
                    catalogName);
        }
    }
}


package com.sdmay19.courseflow.badge;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.semester.Semester;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/badges")
public class BadgeController {
    private final FlowchartService flowchartService;

    public BadgeController(FlowchartService flowchartService) {
        this.flowchartService = flowchartService;
    }

    @GetMapping("/me")
    public List<Course> getCompletedBadges(Authentication auth) {
        AppUser user = (AppUser) auth.getPrincipal();
        Flowchart flowchart = flowchartService.getByUser(user);

        Map<String, Status> statusMap = flowchart.getCourseStatusMap();
        Map<String, Course> completed = new LinkedHashMap<>();

        for (Semester semester : flowchart.getSemesters()) {
            if (semester == null || semester.getCourses() == null) continue;
            for (Course course : semester.getCourses()) {
                if (course == null || course.getCourseIdent() == null) continue;
                Status status = statusMap == null ? null : statusMap.get(course.getCourseIdent());
                if (status == Status.COMPLETED) {
                    completed.putIfAbsent(course.getCourseIdent(), course);
                }
            }
        }

        return completed.values().stream().toList();
    }
}

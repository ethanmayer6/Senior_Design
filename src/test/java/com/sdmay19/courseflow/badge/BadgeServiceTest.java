package com.sdmay19.courseflow.badge;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartInsightsResponse;
import com.sdmay19.courseflow.flowchart.FlowchartRequirementCoverageResponse;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.Term;
import com.sdmay19.courseflow.course.Course;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    @Mock
    private FlowchartService flowchartService;

    @InjectMocks
    private BadgeService badgeService;

    @Test
    void returnsEmptyGamificationWhenFlowchartMissing() {
        when(flowchartService.getByUser(any(AppUser.class)))
                .thenThrow(new FlowchartNotFoundException("missing"));

        BadgeGamificationResponse response = badgeService.getGamification(new AppUser());

        assertEquals(0, response.badges().size());
        assertEquals(0, response.summary().totalXp());
        assertEquals(1, response.summary().level());
        assertNull(response.spotlight());
    }

    @Test
    void computesCompletedBadgeUsingNormalizedStatusIdent() {
        Course course = new Course();
        course.setId(10L);
        course.setCourseIdent("COMS_2270");
        course.setName("Computer Organization and Assembly Level Programming");
        course.setCredits(3);
        course.setDescription("desc");
        course.setOffered("FALL");
        course.setHours("3");

        Semester semester = new Semester();
        semester.setYear(2025);
        semester.setTerm(Term.SPRING);
        semester.setCourses(List.of(course));

        Flowchart flowchart = new Flowchart();
        flowchart.setSemesters(List.of(semester));
        flowchart.setCourseStatusMap(Map.of("com s 2270", Status.COMPLETED));

        FlowchartInsightsResponse insights = new FlowchartInsightsResponse(
                30, 3, 33, 120, 87, 1, 0, 6, "SPRING 2028", List.of());
        FlowchartRequirementCoverageResponse coverage = new FlowchartRequirementCoverageResponse(
                0, 0, 0, 0, List.of());

        AppUser user = new AppUser();
        user.setId(1L);

        when(flowchartService.getByUser(user)).thenReturn(flowchart);
        when(flowchartService.buildInsights(flowchart)).thenReturn(insights);
        when(flowchartService.buildRequirementCoverage(flowchart)).thenReturn(coverage);

        BadgeGamificationResponse response = badgeService.getGamification(user);

        assertEquals(1, response.badges().size());
        assertEquals("COMS_2270", response.badges().get(0).courseIdent());
        assertEquals("RARE", response.badges().get(0).rarity());
        assertEquals(360, response.summary().totalXp());
        assertEquals("SPRING 2028", response.summary().projectedGraduationTerm());

        List<Course> completed = badgeService.getCompletedBadges(user);
        assertEquals(1, completed.size());
        assertEquals("COMS_2270", completed.get(0).getCourseIdent());
        assertTrue(response.quests().size() >= 3);
    }
}

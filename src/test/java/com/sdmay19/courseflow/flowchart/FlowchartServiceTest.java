package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import com.sdmay19.courseflow.semester.Term;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowchartServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private FlowChartRepository flowChartRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FlowchartService flowchartService;

    private Flowchart flowchart;

    @BeforeEach
    void setUp() {
        flowchart = new Flowchart();
        flowchart.setId(99L);
        flowchart.setTotalCredits(125);
        flowchart.setCreditsSatisfied(114);
        flowchart.setSemesters(new ArrayList<>());
        flowchart.setCourseStatusMap(new HashMap<>());
    }

    @Test
    void addCourse_addsIdentToStatusMap() {
        when(flowChartRepository.findById(99L)).thenReturn(Optional.of(flowchart));

        CourseMapRequest req = new CourseMapRequest(Status.IN_PROGRESS, "COMS_4170", "ADD");
        flowchartService.addCourse(99L, req);

        assertThat(flowchart.getCourseStatusMap())
                .containsEntry("COMS_4170", Status.IN_PROGRESS);
    }

    @Test
    void removeCourse_removesIdentFromStatusMap() {
        flowchart.getCourseStatusMap().put("COMS_4170", Status.IN_PROGRESS);
        when(flowChartRepository.findById(99L)).thenReturn(Optional.of(flowchart));

        CourseMapRequest req = new CourseMapRequest(null, "COMS_4170", "REMOVE");
        flowchartService.removeCourse(99L, req);

        assertThat(flowchart.getCourseStatusMap()).doesNotContainKey("COMS_4170");
    }

    @Test
    void removeCourse_throwsWhenIdentMissing() {
        when(flowChartRepository.findById(99L)).thenReturn(Optional.of(flowchart));

        CourseMapRequest req = new CourseMapRequest(null, "COMS_9990", "REMOVE");
        assertThatThrownBy(() -> flowchartService.removeCourse(99L, req))
                .isInstanceOf(CourseNotFoundException.class);
    }

    @Test
    void updateCourseStatus_replacesMappedStatus() {
        flowchart.getCourseStatusMap().put("COMS_4170", Status.UNFULFILLED);
        when(flowChartRepository.findById(99L)).thenReturn(Optional.of(flowchart));

        CourseMapRequest req = new CourseMapRequest(Status.COMPLETED, "COMS_4170", "UPDATE");
        flowchartService.updateCourseStatus(99L, req);

        assertThat(flowchart.getCourseStatusMap())
                .containsEntry("COMS_4170", Status.COMPLETED);
    }

    @Test
    void buildInsights_includesInProgressCreditsAndZeroRemainingWhenCovered() {
        Course inProgress = new Course();
        inProgress.setCourseIdent("COMS_4170");
        inProgress.setCredits(12);

        Semester spring2026 = new Semester();
        spring2026.setYear(2026);
        spring2026.setTerm(Term.SPRING);
        spring2026.setCourses(List.of(inProgress));
        flowchart.setSemesters(List.of(spring2026));
        flowchart.setCourseStatusMap(Map.of(
                "COMS_4170", Status.IN_PROGRESS,
                "COMS_3110", Status.COMPLETED));

        FlowchartInsightsResponse insights = flowchartService.buildInsights(flowchart);

        assertThat(insights.getCompletedCredits()).isEqualTo(114);
        assertThat(insights.getInProgressCredits()).isEqualTo(12);
        assertThat(insights.getAppliedCredits()).isEqualTo(126);
        assertThat(insights.getRemainingCredits()).isEqualTo(0);
        assertThat(insights.getEstimatedTermsToGraduate()).isEqualTo(0);
        assertThat(insights.getProjectedGraduationTerm()).isEqualTo("SPRING 2026");
    }

    @Test
    void buildInsights_returnsRiskFlagsForNoLoadAndLongProjection() {
        flowchart.setTotalCredits(240);
        flowchart.setCreditsSatisfied(0);

        Map<String, Status> statuses = new HashMap<>();
        for (int i = 0; i < 13; i++) {
            statuses.put("COMS_" + (1000 + i), Status.UNFULFILLED);
        }
        flowchart.setCourseStatusMap(statuses);

        FlowchartInsightsResponse insights = flowchartService.buildInsights(flowchart);

        assertThat(insights.getRemainingCredits()).isEqualTo(240);
        assertThat(insights.getEstimatedTermsToGraduate()).isGreaterThan(8);
        assertThat(insights.getRiskFlags())
                .contains("No in-progress credits are currently mapped.")
                .contains("Projected graduation is more than 8 terms away.")
                .contains("Large number of unfulfilled courses remain.");
    }

    @Test
    void buildRequirementCoverage_summarizesRequirementBuckets() {
        Course completedCourse = new Course();
        completedCourse.setCourseIdent("COMS_3110");
        completedCourse.setCredits(3);

        Course inProgressCourse = new Course();
        inProgressCourse.setCourseIdent("COMS_4170");
        inProgressCourse.setCredits(3);

        Course unmetCourse = new Course();
        unmetCourse.setCourseIdent("COMS_3630");
        unmetCourse.setCredits(3);

        RequirementGroup group = new RequirementGroup();
        group.setName("Core Group");
        group.setCourses(List.of(unmetCourse));

        DegreeRequirement reqSatisfied = new DegreeRequirement();
        reqSatisfied.setName("Algorithms Requirement");
        reqSatisfied.setSatisfyingCredits(3);
        reqSatisfied.setCourses(List.of(completedCourse));

        DegreeRequirement reqInProgress = new DegreeRequirement();
        reqInProgress.setName("Systems Requirement");
        reqInProgress.setSatisfyingCredits(6);
        reqInProgress.setCourses(List.of(inProgressCourse));

        DegreeRequirement reqUnmet = new DegreeRequirement();
        reqUnmet.setName("Theory Requirement");
        reqUnmet.setSatisfyingCredits(3);
        reqUnmet.setRequirementGroups(List.of(group));

        Major major = new Major();
        major.setName("Computer Science");
        major.setDegreeRequirements(List.of(reqSatisfied, reqInProgress, reqUnmet));
        flowchart.setMajor(major);
        flowchart.setCourseStatusMap(Map.of(
                "COMS_3110", Status.COMPLETED,
                "COMS_4170", Status.IN_PROGRESS));

        FlowchartRequirementCoverageResponse coverage = flowchartService.buildRequirementCoverage(flowchart);

        assertThat(coverage.getTotalRequirements()).isEqualTo(3);
        assertThat(coverage.getSatisfiedRequirements()).isEqualTo(1);
        assertThat(coverage.getInProgressRequirements()).isEqualTo(1);
        assertThat(coverage.getUnmetRequirements()).isEqualTo(1);
        assertThat(coverage.getRequirements()).hasSize(3);
    }

    @Test
    void buildRequirementCoverage_prefersImportedRequirementStatusAndRemainingWhenPresent() {
        DegreeRequirement req = new DegreeRequirement();
        req.setName("Engineering Core");
        req.setSatisfyingCredits(24);
        req.setCourses(List.of());

        Major major = new Major();
        major.setName("Software Engineering");
        major.setDegreeRequirements(List.of(req));
        flowchart.setMajor(major);
        flowchart.setRequirementRemainingMap(Map.of("Engineering Core", 5));
        flowchart.setRequirementStatusMap(Map.of("Engineering Core", "IN_PROGRESS"));
        flowchart.setCourseStatusMap(Map.of());

        FlowchartRequirementCoverageResponse coverage = flowchartService.buildRequirementCoverage(flowchart);

        assertThat(coverage.getRequirements()).hasSize(1);
        FlowchartRequirementCoverageResponse.RequirementCoverageItem item = coverage.getRequirements().get(0);
        assertThat(item.getName()).isEqualTo("Engineering Core");
        assertThat(item.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(item.getRemainingCredits()).isEqualTo(5);
    }
}

package com.sdmay19.courseflow.importer;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AcademicProgressServiceTest {

    @Mock
    private AcademicProgressParser parser;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private FlowchartService flowchartService;

    @Mock
    private MajorRepository majorRepository;

    @InjectMocks
    private AcademicProgressService academicProgressService;

    @Captor
    private ArgumentCaptor<Map<String, Status>> statusMapCaptor;

    @Captor
    private ArgumentCaptor<Map<String, List<Course>>> coursesByPeriodCaptor;

    @Captor
    private ArgumentCaptor<Map<String, Integer>> remainingMapCaptor;

    @Captor
    private ArgumentCaptor<Map<String, String>> requirementStatusCaptor;

    @Test
    void processProgress_splitsIsuTransferAndUnmatchedCourses() {
        Course coms2270 = course("COMS_2270", "Object-Oriented Programming", 4, Set.of());
        Course engl1500 = course("ENGL_1500", "Critical Thinking", 3, Set.of());
        when(parser.parse(any())).thenReturn(new AcademicProgressParser.ParsedReport(
                List.of(
                        new AcademicProgressParser.ParsedRow("COMS_2270", "Object-Oriented Programming", "FALL2024", "Math Core", "IN_PROGRESS", 3),
                        new AcademicProgressParser.ParsedRow("ENGL_1500", "Critical Thinking", null, "Comm", "SATISFIED", 0),
                        new AcademicProgressParser.ParsedRow("MATH_1650", "Calculus I", "SPRING2024", "Math Core", "IN_PROGRESS", 3)),
                new AcademicProgressParser.ParsedCredits(120, 93, 6),
                List.of(new AcademicProgressParser.ParsedRequirement("Math Core", "IN_PROGRESS", 3))));
        when(courseRepository.findByCourseIdent("COMS_2270")).thenReturn(Optional.of(coms2270));
        when(courseRepository.findByCourseIdent("ENGL_1500")).thenReturn(Optional.of(engl1500));
        when(courseRepository.findByCourseIdent("MATH_1650")).thenReturn(Optional.empty());

        AcademicProgressService.StudentProgressResult result = academicProgressService.processProgress(sampleFile());

        assertThat(result.isuCourses()).hasSize(1);
        assertThat(result.transferCourses()).hasSize(1);
        assertThat(result.unmatchedCourses()).containsExactly("MATH_1650");
        assertThat(result.creditsDefined()).isEqualTo(120);
        assertThat(result.requirements()).extracting(AcademicProgressParser.ParsedRequirement::name)
                .containsExactly("Math Core");
    }

    @Test
    void buildFlowchartFromProgress_includesPrerequisiteAncestorsAndEdges() {
        Course math1650 = course("MATH_1650", "Calculus I", 4, Set.of());
        Course coms2270 = course("COMS_2270", "Object-Oriented Programming", 4, Set.of("MATH_1650"));
        Course coms2280 = course("COMS_2280", "Data Structures", 4, Set.of("COMS_2270"));

        when(parser.parse(any())).thenReturn(new AcademicProgressParser.ParsedReport(
                List.of(new AcademicProgressParser.ParsedRow("COMS_2280", "Data Structures", "FALL2024", null, null, null)),
                new AcademicProgressParser.ParsedCredits(4, 4, 0),
                List.of()));
        when(courseRepository.findByCourseIdent("COMS_2280")).thenReturn(Optional.of(coms2280));
        when(courseRepository.findByCourseIdent("COMS_2270")).thenReturn(Optional.of(coms2270));
        when(courseRepository.findByCourseIdent("MATH_1650")).thenReturn(Optional.of(math1650));

        AcademicProgressService.FlowchartResult result = academicProgressService.buildFlowchartFromProgress(sampleFile());

        assertThat(result.completedCourses()).containsExactly("COMS_2280");
        assertThat(result.academicPeriods()).containsEntry("COMS_2280", "FALL2024");
        assertThat(result.courses()).extracting(Course::getCourseIdent)
                .containsExactlyInAnyOrder("COMS_2280", "COMS_2270", "MATH_1650");
        assertThat(result.edges())
                .extracting(edge -> edge[0] + "->" + edge[1])
                .containsExactlyInAnyOrder("COMS_2270->COMS_2280", "MATH_1650->COMS_2270");
    }

    @Test
    void createFlowchartFromProgress_deduplicatesCoursesBuildsRequirementMapsAndCreatesFallbackMajor() {
        AppUser user = new AppUser();
        user.setId(14L);
        user.setEmail("student@example.edu");
        user.setRole("USER");
        user.setMajor("Unknown Major");

        Course coms2270 = course("COMS_2270", "Object-Oriented Programming", 4, Set.of());
        Course coms2280 = course("COMS_2280", "Data Structures", 4, Set.of("COMS_2270"));
        Major fallbackMajor = new Major();
        fallbackMajor.setId(99L);
        fallbackMajor.setName("Unknown Major");

        when(parser.parse(any())).thenReturn(new AcademicProgressParser.ParsedReport(
                List.of(
                        new AcademicProgressParser.ParsedRow("COMS_2270", "Object-Oriented Programming", null, null, null, null),
                        new AcademicProgressParser.ParsedRow("COMS_2270", "Object-Oriented Programming", "FALL2001", "Math Core", "in_progress", 6),
                        new AcademicProgressParser.ParsedRow("COMS_2280", "Data Structures", "SPRING2099", null, null, null)),
                new AcademicProgressParser.ParsedCredits(130, 140, 6),
                List.of(new AcademicProgressParser.ParsedRequirement("Math Core", "in_progress", 6))));
        when(courseRepository.findByCourseIdent("COMS_2270")).thenReturn(Optional.of(coms2270));
        when(courseRepository.findByCourseIdent("COMS_2280")).thenReturn(Optional.of(coms2280));
        when(majorRepository.findByNameIgnoreCase("Unknown Major")).thenReturn(Optional.empty());
        when(majorRepository.findAll()).thenReturn(List.of());
        when(majorRepository.save(any(Major.class))).thenReturn(fallbackMajor);
        when(flowchartService.createFromProgress(any(), any(), any(), any(), any(Integer.class), any(Integer.class), any(), any()))
                .thenReturn(new Flowchart());

        academicProgressService.createFlowchartFromProgress(sampleFile(), user);

        verify(flowchartService).createFromProgress(
                org.mockito.Mockito.eq(user),
                org.mockito.Mockito.eq(fallbackMajor),
                statusMapCaptor.capture(),
                coursesByPeriodCaptor.capture(),
                org.mockito.Mockito.eq(130),
                org.mockito.Mockito.eq(130),
                remainingMapCaptor.capture(),
                requirementStatusCaptor.capture());

        assertThat(statusMapCaptor.getValue())
                .containsEntry("COMS_2270", Status.COMPLETED)
                .containsEntry("COMS_2280", Status.UNFULFILLED);
        assertThat(coursesByPeriodCaptor.getValue().keySet()).containsExactlyInAnyOrder("FALL2001", "SPRING2099");
        assertThat(coursesByPeriodCaptor.getValue().get("FALL2001")).containsExactly(coms2270);
        assertThat(coursesByPeriodCaptor.getValue().get("SPRING2099")).containsExactly(coms2280);
        assertThat(remainingMapCaptor.getValue()).containsEntry("Math Core", 6);
        assertThat(requirementStatusCaptor.getValue()).containsEntry("Math Core", "IN_PROGRESS");
    }

    private MockMultipartFile sampleFile() {
        return new MockMultipartFile("file", "progress.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "fake".getBytes());
    }

    private Course course(String ident, String name, int credits, Set<String> prerequisites) {
        Course course = new Course();
        course.setCourseIdent(ident);
        course.setName(name);
        course.setCredits(credits);
        course.setPrerequisites(prerequisites);
        return course;
    }
}

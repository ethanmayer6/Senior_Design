package com.sdmay19.courseflow.semester;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.course.CourseService;
import com.sdmay19.courseflow.exception.course.CourseCreationException;
import com.sdmay19.courseflow.flowchart.FlowChartRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SemesterServiceTest {

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private FlowChartRepository flowChartRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseService courseService;

    @Mock
    private FlowchartService flowchartService;

    @InjectMocks
    private SemesterService semesterService;

    private Semester semester;
    private Flowchart flowchart;

    @BeforeEach
    void setUp() {
        flowchart = new Flowchart();
        flowchart.setId(10L);
        flowchart.setCourseStatusMap(new HashMap<>());

        semester = new Semester();
        semester.setId(1L);
        semester.setFlowchart(flowchart);
        semester.setCourses(new ArrayList<>());
    }

    @Test
    void addCourse_throwsWhenPrerequisitesMissing() {
        Course targetCourse = new Course();
        targetCourse.setCourseIdent("COMS_4170");
        targetCourse.setPrerequisites(java.util.Set.of("COMS_3110"));
        targetCourse.setCredits(3);

        when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
        when(courseService.getByCourseIdent("COMS_4170")).thenReturn(targetCourse);

        assertThatThrownBy(() -> semesterService.addCourse(1L, "COMS_4170"))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("Missing prerequisites");
    }

    @Test
    void addCourse_succeedsWhenPrerequisitesInProgressOrCompleted() {
        Course targetCourse = new Course();
        targetCourse.setCourseIdent("COMS_4170");
        targetCourse.setPrerequisites(java.util.Set.of("COMS_3110"));
        targetCourse.setCredits(3);

        Map<String, Status> statuses = new HashMap<>();
        statuses.put("COMS_3110", Status.IN_PROGRESS);
        flowchart.setCourseStatusMap(statuses);

        when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
        when(courseService.getByCourseIdent("COMS_4170")).thenReturn(targetCourse);
        when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

        semesterService.addCourse(1L, "COMS_4170");

        verify(semesterRepository).save(semester);
    }

    @Test
    void addCourse_usesPrereqTextFallbackWhenStructuredPrereqsMissing() {
        Course targetCourse = new Course();
        targetCourse.setCourseIdent("SE_3190");
        targetCourse.setPrerequisites(java.util.Set.of());
        targetCourse.setPrereq_txt("Prereq: COM S 2280 and COM S 3090");
        targetCourse.setCredits(3);

        Map<String, Status> statuses = new HashMap<>();
        statuses.put("COMS_2280", Status.COMPLETED);
        flowchart.setCourseStatusMap(statuses);

        when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
        when(courseService.getByCourseIdent("SE_3190")).thenReturn(targetCourse);

        assertThatThrownBy(() -> semesterService.addCourse(1L, "SE_3190"))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("COMS_3090");
    }

    @Test
    void addCourse_throwsWhenCorequisitesMissing() {
        Course targetCourse = new Course();
        targetCourse.setCourseIdent("CPRE_4300");
        targetCourse.setPrereq_txt("Co-req: COM S 3270");
        targetCourse.setCredits(3);

        when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
        when(courseService.getByCourseIdent("CPRE_4300")).thenReturn(targetCourse);

        assertThatThrownBy(() -> semesterService.addCourse(1L, "CPRE_4300"))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("Missing co-requisites")
                .hasMessageContaining("COMS_3270");
    }

    @Test
    void addCourse_allowsWhenCorequisiteAlreadyInSemester() {
        Course existingCoreq = new Course();
        existingCoreq.setCourseIdent("COMS_3270");
        semester.setCourses(new ArrayList<>(java.util.List.of(existingCoreq)));

        Course targetCourse = new Course();
        targetCourse.setCourseIdent("CPRE_4300");
        targetCourse.setPrereq_txt("Co-req: COM S 3270");
        targetCourse.setCredits(3);

        when(semesterRepository.findById(1L)).thenReturn(Optional.of(semester));
        when(courseService.getByCourseIdent("CPRE_4300")).thenReturn(targetCourse);
        when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

        semesterService.addCourse(1L, "CPRE_4300");

        verify(semesterRepository).save(semester);
    }
}

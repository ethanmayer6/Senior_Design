package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.flowchart.FlowChartRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.flowchart.FlowchartService;
import com.sdmay19.courseflow.flowchart.Status;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import com.sdmay19.courseflow.semester.Term;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassScheduleImportServiceTest {

    @Mock
    private ClassScheduleImportParser parser;

    @Mock
    private ClassScheduleEntryRepository scheduleRepository;

    @Mock
    private FlowchartService flowchartService;

    @Mock
    private FlowChartRepository flowChartRepository;

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private ClassScheduleImportService importService;

    @Captor
    private ArgumentCaptor<List<ClassScheduleEntry>> entriesCaptor;

    @Test
    void importSchedule_rejectsEmptyFiles() {
        assertThatThrownBy(() -> importService.importSchedule(
                new MockMultipartFile("file", "schedule.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[0]),
                buildUser()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("No file uploaded.");
    }

    @Test
    void importSchedule_createsSemestersPersistsEntriesAndMarksCoursesInProgress() {
        AppUser user = buildUser();
        Flowchart flowchart = new Flowchart();
        flowchart.setId(21L);
        flowchart.setSemesters(new ArrayList<>());
        flowchart.setCourseStatusMap(null);

        Course linkedCourse = new Course();
        linkedCourse.setCourseIdent("COMS_2270");
        linkedCourse.setName("Object-Oriented Programming");
        linkedCourse.setCredits(4);

        when(flowchartService.getByUser(user)).thenReturn(flowchart);
        when(parser.parse(any())).thenReturn(List.of(
                new ClassScheduleImportParser.ParsedScheduleRow(
                        "2026 Fall Semester",
                        2026,
                        Term.FALL,
                        LocalDate.of(2026, 8, 24),
                        LocalDate.of(2026, 12, 18),
                        "COMS_2270",
                        "COMS2270-A",
                        "Object-Oriented Programming",
                        "MWF | 9:00 AM - 9:50 AM",
                        "MWF",
                        LocalTime.of(9, 0),
                        LocalTime.of(9, 50),
                        LocalDate.of(2026, 8, 31),
                        LocalDate.of(2026, 11, 1),
                        "Dr. Ada",
                        "In Person",
                        "Durham 1212",
                        "Lecture"),
                new ClassScheduleImportParser.ParsedScheduleRow(
                        "2026 Fall Semester",
                        2026,
                        Term.FALL,
                        LocalDate.of(2026, 8, 24),
                        LocalDate.of(2026, 12, 18),
                        "ENGL_2500",
                        "ENGL2500-B",
                        "Written Communication",
                        "TR | 1:00 PM - 2:15 PM",
                        "TR",
                        LocalTime.of(13, 0),
                        LocalTime.of(14, 15),
                        LocalDate.of(2026, 8, 31),
                        LocalDate.of(2026, 11, 1),
                        "Dr. Byron",
                        "Online",
                        "Remote",
                        "Lecture")));
        when(courseRepository.findByCourseIdent("COMS_2270")).thenReturn(Optional.of(linkedCourse));
        when(courseRepository.findByCourseIdent("ENGL_2500")).thenReturn(Optional.empty());

        ClassScheduleImportService.ImportResult result = importService.importSchedule(sampleFile(), user);

        assertThat(result.parsedRows()).isEqualTo(2);
        assertThat(result.importedRows()).isEqualTo(2);
        assertThat(result.linkedCatalogCourses()).isEqualTo(1);
        assertThat(result.distinctCoursesSynced()).isEqualTo(1);
        assertThat(result.touchedSemesters()).isEqualTo(1);
        assertThat(flowchart.getCourseStatusMap()).containsEntry("COMS_2270", Status.IN_PROGRESS);
        assertThat(flowchart.getSemesters()).hasSize(1);
        assertThat(flowchart.getSemesters().get(0).getCourses()).containsExactly(linkedCourse);

        verify(scheduleRepository).deleteAllByFlowchartAndYearAndTerm(flowchart, 2026, Term.FALL);
        verify(scheduleRepository).saveAll(entriesCaptor.capture());
        verify(semesterRepository).save(any(Semester.class));
        verify(flowChartRepository).save(flowchart);

        List<ClassScheduleEntry> persistedEntries = entriesCaptor.getValue();
        assertThat(persistedEntries).hasSize(2);
        assertThat(persistedEntries.get(0).getCourse()).isEqualTo(linkedCourse);
        assertThat(persistedEntries.get(1).getCourse()).isNull();
    }

    @Test
    void getTermEntries_usesResolvedFlowchartAndRequestedTerm() {
        AppUser user = buildUser();
        Flowchart flowchart = new Flowchart();
        ClassScheduleEntry entry = new ClassScheduleEntry();
        entry.setCourseIdent("COMS_2270");

        when(flowchartService.getByUser(user)).thenReturn(flowchart);
        when(scheduleRepository.findAllByFlowchartAndYearAndTermOrderByMeetingStartTimeAsc(flowchart, 2026, Term.FALL))
                .thenReturn(List.of(entry));

        List<ClassScheduleEntry> entries = importService.getTermEntries(user, 2026, Term.FALL);

        assertThat(entries).containsExactly(entry);
    }

    private MockMultipartFile sampleFile() {
        return new MockMultipartFile("file", "schedule.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "fake".getBytes());
    }

    private AppUser buildUser() {
        AppUser user = new AppUser();
        user.setId(14L);
        user.setEmail("student@example.edu");
        user.setRole("USER");
        user.setMajor("Software Engineering");
        return user;
    }
}

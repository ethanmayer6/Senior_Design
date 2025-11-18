package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.exception.course.CourseCreationException;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.course.CourseUpdateException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private CourseService courseService;

    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        sampleCourse = new Course();
        sampleCourse.setId(1L);
        sampleCourse.setName("Data Structures");
        sampleCourse.setCourseIdent("COMS_2280");
        sampleCourse.setCredits(3);
        sampleCourse.setPrereq_txt("COMS_1270");
        sampleCourse.setPrerequisites(new HashSet<>(Set.of("COMS_1270")));
        sampleCourse.setDescription("Intro to data structures");
        sampleCourse.setHours("3");
        sampleCourse.setOffered("Fall");
    }

    // ------- requiredFields --------

    @Test
    void requiredFields_returnsTrue_whenAllRequiredFieldsPresent() {
        boolean result = courseService.requiredFields(sampleCourse);

        assertThat(result).isTrue();
    }

    @Test
    void requiredFields_returnsFalse_whenNameMissing() {
        sampleCourse.setName(null);

        boolean result = courseService.requiredFields(sampleCourse);

        assertThat(result).isFalse();
    }

    @Test
    void requiredFields_returnsFalse_whenDescriptionMissing() {
        sampleCourse.setDescription("");

        boolean result = courseService.requiredFields(sampleCourse);

        assertThat(result).isFalse();
    }

    @Test
    void requiredFields_returnsFalse_whenCourseIdentMissing() {
        sampleCourse.setCourseIdent("");

        boolean result = courseService.requiredFields(sampleCourse);

        assertThat(result).isFalse();
    }

    // ------- createAll --------

    @Test
    void createAll_savesAll_whenValidAndUnique() {
        Course c1 = new Course("Data Structures", "COMS_2280", 3, null,
                new HashSet<>(Set.of("COMS_1270", "COMS_2280")), // includes self
                "desc", "3", "Fall");
        Course c2 = new Course("Algorithms", "COMS_3110", 3, null,
                new HashSet<>(Set.of("COMS_2280")),
                "desc", "3", "Spring");

        List<Course> courses = List.of(c1, c2);

        when(courseRepository.findByCourseIdent("COMS_2280")).thenReturn(Optional.empty());
        when(courseRepository.findByCourseIdent("COMS_3110")).thenReturn(Optional.empty());
        when(courseRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Course> saved = courseService.createAll(courses);

        assertThat(saved).hasSize(2);

        // verify self prerequisite removed by service (on the Set of idents)
        assertThat(c1.getPrerequisites()).doesNotContain("COMS_2280");

        verify(courseRepository).saveAll(courses);
    }

    @Test
    void createAll_throwsCourseCreationException_whenRequiredFieldsMissing() {
        Course invalid = new Course();
        invalid.setName(null); // required

        List<Course> list = List.of(invalid);

        assertThatThrownBy(() -> courseService.createAll(list))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("Required fields not present");
        verify(courseRepository, never()).saveAll(anyList());
    }

    @Test
    void createAll_throwsCourseCreationException_whenDuplicateCourseIdent() {
        Course c1 = new Course("Data Structures", "COMS_2280", 3, null,
                new HashSet<>(), "desc", "3", "Fall");

        when(courseRepository.findByCourseIdent("COMS_2280"))
                .thenReturn(Optional.of(sampleCourse)); // already exists

        assertThatThrownBy(() -> courseService.createAll(List.of(c1)))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("courseIdent already exists");

        verify(courseRepository, never()).saveAll(anyList());
    }

    // ------- create --------

    @Test
    void create_savesCourse_whenValidAndUnique() {
        when(courseRepository.findByCourseIdent("COMS_2280")).thenReturn(Optional.empty());
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        Course created = courseService.create(sampleCourse);

        assertThat(created).isNotNull();
        verify(courseRepository).save(sampleCourse);
    }

    @Test
    void create_throwsCourseCreationException_whenRequiredFieldsMissing() {
        sampleCourse.setName(null);

        assertThatThrownBy(() -> courseService.create(sampleCourse))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("Required fields not present");

        verify(courseRepository, never()).save(any());
    }

    @Test
    void create_throwsCourseCreationException_whenCourseIdentAlreadyExists() {
        when(courseRepository.findByCourseIdent("COMS_2280"))
                .thenReturn(Optional.of(sampleCourse));

        assertThatThrownBy(() -> courseService.create(sampleCourse))
                .isInstanceOf(CourseCreationException.class)
                .hasMessageContaining("already exists");

        verify(courseRepository, never()).save(any());
    }

    // ------- getById / getByName / getByCourseIdent / getAllCourse / getAllById --------

    @Test
    void getById_returnsCourse_whenFound() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

        Course found = courseService.getById(1L);

        assertThat(found).isSameAs(sampleCourse);
    }

    @Test
    void getById_throwsCourseNotFoundException_whenNotFound() {
        when(courseRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.getById(1L))
                .isInstanceOf(CourseNotFoundException.class)
                .hasMessageContaining("id: 1");
    }

    @Test
    void getAllById_returnsList_whenNonEmpty() {
        when(courseRepository.findAllById(List.of(1L, 2L)))
                .thenReturn(List.of(sampleCourse));

        List<Course> result = courseService.getAllById(List.of(1L, 2L));

        assertThat(result).hasSize(1);
    }

    @Test
    void getAllById_throwsCourseNotFoundException_whenEmpty() {
        when(courseRepository.findAllById(anyList())).thenReturn(List.of());

        assertThatThrownBy(() -> courseService.getAllById(List.of(1L, 2L)))
                .isInstanceOf(CourseNotFoundException.class)
                .hasMessageContaining("Group of courses could not be found");
    }

    @Test
    void getByName_returnsCourse_whenFound() {
        when(courseRepository.findByName("Data Structures"))
                .thenReturn(Optional.of(sampleCourse));

        Course result = courseService.getByName("Data Structures");

        assertThat(result).isSameAs(sampleCourse);
    }

    @Test
    void getByCourseIdent_returnsCourse_whenFound() {
        when(courseRepository.findByCourseIdent("COMS_2280"))
                .thenReturn(Optional.of(sampleCourse));

        Course result = courseService.getByCourseIdent("COMS_2280");

        assertThat(result).isSameAs(sampleCourse);
    }

    @Test
    void getAllCourse_returnsAllCourses() {
        when(courseRepository.findAll()).thenReturn(List.of(sampleCourse));

        List<Course> result = courseService.getAllCourse();

        assertThat(result).containsExactly(sampleCourse);
    }

    // ------- getPage / searchCourse / filterCourse --------

    @Test
    void getPage_returnsContentFromRepository() {
        when(courseRepository.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleCourse)));

        List<Course> result = courseService.getPage(0, 10);

        assertThat(result).containsExactly(sampleCourse);
    }

    @Test
    void searchCourse_callsRepositoryWithNormalizedIdent() {
        when(courseRepository.findByCourseIdentContainingIgnoreCase("COMS_2280"))
                .thenReturn(List.of(sampleCourse));

        List<Course> result = courseService.searchCourse("COMS 2280"); // space

        assertThat(result).containsExactly(sampleCourse);
        verify(courseRepository).findByCourseIdentContainingIgnoreCase("COMS_2280");
    }

    @Test
    void filterCourse_buildsSpecificationAndDelegatesToRepository() {
        when(courseRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleCourse)));

        List<Course> result = courseService.filterCourse("2000", "Fall", "COMS", 0, 50);

        assertThat(result).containsExactly(sampleCourse);
        verify(courseRepository).findAll(any(Specification.class), any(PageRequest.class));
    }

    // ------- updateCourse --------

    @Test
    void updateCourse_updatesSimpleFields_whenPresentInUpdater() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        CourseUpdater updater = new CourseUpdater();
        updater.setName("New Name");
        updater.setIdent("COMS_2280_NEW");
        updater.setCredits(4);
        updater.setPrereq_txt("NEW PREREQ");
        updater.setDescription("New desc");
        updater.setHours("4");
        updater.setOffered("Spring");

        Course updated = courseService.updateCourse(1L, updater);

        assertThat(updated.getName()).isEqualTo("New Name");
        assertThat(updated.getCourseIdent()).isEqualTo("COMS_2280_NEW");
        assertThat(updated.getCredits()).isEqualTo(4);
        assertThat(updated.getPrereq_txt()).isEqualTo("NEW PREREQ");
        assertThat(updated.getDescription()).isEqualTo("New desc");
        assertThat(updated.getHours()).isEqualTo("4");
        assertThat(updated.getOffered()).isEqualTo("Spring");

        verify(courseRepository).save(sampleCourse);
    }

    @Test
    void updateCourse_throwsWhenPrereqListContainsSelfIdent() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

        CourseUpdater updater = new CourseUpdater();
        updater.setPrereqIds(List.of("COMS_2280"));

        assertThatThrownBy(() -> courseService.updateCourse(1L, updater))
                .isInstanceOf(CourseUpdateException.class)
                .hasMessageContaining("cannot list itself as a prerequisite");
    }

//    @Test
//    void updateCourse_throwsWhenNotAllPrereqCoursesFound() {
//        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));
//
//        CourseUpdater updater = new CourseUpdater();
//        updater.setPrereqIds(List.of("COMS_2280", "COMS_3110"));
//
//        when(courseRepository.findAllByCourseIdentIn(List.of("COMS_2280", "COMS_3110")))
//                .thenReturn(List.of(sampleCourse)); // only one found
//
//        assertThatThrownBy(() -> courseService.updateCourse(1L, updater))
//                .isInstanceOf(CourseUpdateException.class)
//                .hasMessageContaining("Prerequisite courses not found");
//    }

    @Test
    void updateCourse_throwsWhenCycleDetected() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

        Course cPrereq = new Course();
        cPrereq.setCourseIdent("COMS_3110");
        cPrereq.setPrerequisites(new HashSet<>(Set.of("COMS_2280"))); // cycle: prereq lists this course

        CourseUpdater updater = new CourseUpdater();
        updater.setPrereqIds(List.of("COMS_3110"));

        when(courseRepository.findAllByCourseIdentIn(List.of("COMS_3110")))
                .thenReturn(List.of(cPrereq));

        assertThatThrownBy(() -> courseService.updateCourse(1L, updater))
                .isInstanceOf(CourseUpdateException.class)
                .hasMessageContaining("Cycle detected");
    }

    @Test
    void updateCourse_setsNewPrerequisites_whenValid() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

        Course c1 = new Course();
        c1.setCourseIdent("COMS_1270");
        c1.setPrerequisites(new HashSet<>());

        Course c2 = new Course();
        c2.setCourseIdent("COMS_2280_PRE");
        c2.setPrerequisites(new HashSet<>());

        List<String> newPrereqIdents = List.of("COMS_1270", "COMS_2280_PRE");

        CourseUpdater updater = new CourseUpdater();
        updater.setPrereqIds(newPrereqIdents);

        when(courseRepository.findAllByCourseIdentIn(newPrereqIdents))
                .thenReturn(List.of(c1, c2));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        Course updated = courseService.updateCourse(1L, updater);

        assertThat(updated.getPrerequisites()).containsExactlyInAnyOrder("COMS_1270", "COMS_2280_PRE");
        verify(courseRepository).save(sampleCourse);
    }

    // ------- deleteById --------

    @Test
    void deleteById_deletesCourse_whenExists() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

        courseService.deleteById(1L);

        verify(courseRepository).delete(sampleCourse);
    }

//    @Test
//    void deleteById_throwsCourseNotFoundException_whenNoCourse() {
//        when(courseRepository.findById(1L)).thenReturn(Optional.empty());
//
//        assertThatThrownBy(() -> courseService.deleteById(1L))
//                .isInstanceOf(CourseNotFoundException.class);
//        verify(courseRepository, never()).delete(any());
//    }
}

package com.sdmay19.courseflow.degree_requirement;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.course.CourseService;
import com.sdmay19.courseflow.exception.degreerequirement.DegreeRequirementCreationException;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.requirement_group.RequirementGroupRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroupService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DegreeRequirementServiceTest {

    @Mock
    private DegreeRequirementRepository degreeRequirementRepository;

    @Mock
    private CourseService courseService;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private RequirementGroupService requirementGroupService;

    @Mock
    private RequirementGroupRepository requirementGroupRepository;

    @Test
    void creatFromDTO_buildsAndSavesRequirementFromResolvedReferences() {
        DegreeRequirementService service = new DegreeRequirementService(
                degreeRequirementRepository,
                courseService,
                courseRepository,
                requirementGroupService,
                requirementGroupRepository);

        Course course = new Course();
        course.setCourseIdent("COMS_2280");
        course.setName("Data Structures");
        course.setCredits(3);
        course.setDescription("desc");
        course.setPrerequisites(java.util.Set.of());
        course.setOffered("Fall");

        RequirementGroup group = new RequirementGroup();
        group.setName("Electives");
        group.setSatisfyingCredits(3);

        DegreeRequirementDTO dto = new DegreeRequirementDTO(
                "Core Coursework",
                List.of("COMS_2280"),
                List.of("Electives"),
                9);

        when(courseRepository.findAllByCourseIdentIn(List.of("COMS_2280"))).thenReturn(List.of(course));
        when(requirementGroupRepository.findAllByNameIn(List.of("Electives"))).thenReturn(List.of(group));
        when(degreeRequirementRepository.existsByName("Core Coursework")).thenReturn(false);
        when(degreeRequirementRepository.save(any(DegreeRequirement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DegreeRequirement saved = service.creatFromDTO(dto);

        assertThat(saved.getName()).isEqualTo("Core Coursework");
        assertThat(saved.getCourses()).containsExactly(course);
        assertThat(saved.getRequirementGroups()).containsExactly(group);
        assertThat(saved.getSatisfyingCredits()).isEqualTo(9);
    }

    @Test
    void validateDegreeRequirement_rejectsRequirementsWithoutCoursesOrGroups() {
        DegreeRequirementService service = new DegreeRequirementService(
                degreeRequirementRepository,
                courseService,
                courseRepository,
                requirementGroupService,
                requirementGroupRepository);

        DegreeRequirement invalid = new DegreeRequirement("Empty Requirement", List.of(), List.of(), 3);

        assertThatThrownBy(() -> service.validateDegreeRequirement(invalid))
                .isInstanceOf(DegreeRequirementCreationException.class)
                .hasMessageContaining("cannot be empty");
    }
}

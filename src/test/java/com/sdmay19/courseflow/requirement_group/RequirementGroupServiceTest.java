package com.sdmay19.courseflow.requirement_group;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequirementGroupServiceTest {

    @Mock
    private RequirementGroupRepository requirementGroupRepository;

    @Mock
    private CourseRepository courseRepository;

    @Test
    void createFromDTO_buildsAndSavesRequirementGroup() {
        RequirementGroupService service = new RequirementGroupService(requirementGroupRepository, courseRepository);

        Course algorithms = course("COMS_3110");
        RequirementGroupDTO dto = new RequirementGroupDTO("Algorithms Pool", 6, List.of("COMS_3110"));

        when(courseRepository.findAllByCourseIdentIn(List.of("COMS_3110"))).thenReturn(List.of(algorithms));
        when(requirementGroupRepository.existsByName("Algorithms Pool")).thenReturn(false);
        when(requirementGroupRepository.save(any(RequirementGroup.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RequirementGroup saved = service.createFromDTO(dto);

        assertThat(saved.getName()).isEqualTo("Algorithms Pool");
        assertThat(saved.getSatisfyingCredits()).isEqualTo(6);
        assertThat(saved.getCourses()).containsExactly(algorithms);
    }

    @Test
    void linkCoursesToExistingGroup_addsOnlyNewCourses() {
        RequirementGroupService service = new RequirementGroupService(requirementGroupRepository, courseRepository);

        Course existing = course("COMS_2280");
        Course added = course("SE_4170");

        RequirementGroup group = new RequirementGroup();
        group.setId(5L);
        group.setName("Core");
        group.setCourses(new ArrayList<>(List.of(existing)));

        when(requirementGroupRepository.findById(5L)).thenReturn(Optional.of(group));
        when(courseRepository.findAllByCourseIdentIn(List.of("COMS_2280", "SE_4170"))).thenReturn(List.of(existing, added));
        when(requirementGroupRepository.save(any(RequirementGroup.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RequirementGroup updated = service.linkCoursesToExistingGroup(5L, List.of("COMS_2280", "SE_4170"));

        assertThat(updated.getCourses()).containsExactly(existing, added);
        verify(requirementGroupRepository).save(group);
    }

    private Course course(String ident) {
        Course course = new Course();
        course.setCourseIdent(ident);
        course.setName(ident);
        course.setCredits(3);
        course.setPrerequisites(java.util.Set.of());
        course.setDescription("desc");
        course.setOffered("Fall");
        return course;
    }
}

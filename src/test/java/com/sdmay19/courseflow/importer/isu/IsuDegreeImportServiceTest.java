package com.sdmay19.courseflow.importer.isu;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementRepository;
import com.sdmay19.courseflow.major.College;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroupRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IsuDegreeImportServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private DegreeRequirementRepository degreeRequirementRepository;

    @Mock
    private RequirementGroupRepository requirementGroupRepository;

    @Test
    void importMajorsOnly_createsPlaceholderCoursesAndDefaultsUnknownCollege() {
        IsuDegreeImportService service = new IsuDegreeImportService(
                courseRepository,
                majorRepository,
                degreeRequirementRepository,
                requirementGroupRepository);

        IsuDegreeDataset dataset = new IsuDegreeDataset(
                "isu",
                "2026-2027",
                List.of(),
                List.of(new IsuDegreeDataset.MajorImport(
                        "Software Engineering",
                        "mystery college",
                        "SE curriculum",
                        List.of(new IsuDegreeDataset.DegreeRequirementImport(
                                "Core Coursework",
                                9,
                                List.of("SE_4910"),
                                List.of())))));

        when(courseRepository.findAllByCourseIdentIn(any(List.class))).thenReturn(List.of());
        when(courseRepository.saveAll(any(List.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(majorRepository.findAll()).thenReturn(List.of());
        when(majorRepository.save(any(Major.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IsuDegreeImportResult result = service.importMajorsOnly(dataset);

        ArgumentCaptor<Major> majorCaptor = ArgumentCaptor.forClass(Major.class);
        verify(majorRepository).save(majorCaptor.capture());

        Major savedMajor = majorCaptor.getValue();
        assertThat(savedMajor.getName()).isEqualTo("Software Engineering");
        assertThat(savedMajor.getCollege()).isEqualTo(College.LIBERAL_ARTS_AND_SCIENCES);
        assertThat(savedMajor.getDegreeRequirements()).hasSize(1);
        assertThat(savedMajor.getDegreeRequirements().get(0).getCourses())
                .extracting(Course::getCourseIdent)
                .containsExactly("SE_4910");

        assertThat(result.getMajorsCreated()).isEqualTo(1);
        assertThat(result.getRequirementsCreated()).isEqualTo(1);
        assertThat(result.getWarnings())
                .anyMatch(warning -> warning.contains("Unknown college"))
                .anyMatch(warning -> warning.contains("placeholder courses"));
    }
}

package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementService;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MajorServiceTest {

    @Mock
    private MajorRepository majorRepository;

    @Mock
    private DegreeRequirementService degreeRequirementService;

    @Mock
    private DegreeRequirementRepository degreeRequirementRepository;

    @Test
    void getMajorByName_prefersDuplicateEntryWithRicherRequirements() {
        MajorService majorService = new MajorService(majorRepository, degreeRequirementService, degreeRequirementRepository);

        DegreeRequirement lighterRequirement = new DegreeRequirement();
        lighterRequirement.setName("Core");

        DegreeRequirement richerRequirement = new DegreeRequirement();
        richerRequirement.setName("Core");
        richerRequirement.setCourses(List.of(new com.sdmay19.courseflow.course.Course(), new com.sdmay19.courseflow.course.Course()));
        richerRequirement.setRequirementGroups(List.of(new RequirementGroup()));

        Major lighter = new Major("Software Engineering", College.ENGINEERING, "lighter", List.of(lighterRequirement));
        Major richer = new Major("Software Engineering", College.LIBERAL_ARTS_AND_SCIENCES, "richer", List.of(richerRequirement));

        when(majorRepository.findAllByNameIgnoreCase("Software Engineering")).thenReturn(List.of(lighter, richer));

        Major selected = majorService.getMajorByName("Software Engineering");

        assertThat(selected).isSameAs(richer);
    }

    @Test
    void getMajorSummariesPage_normalizesQueryAndCapsPageSize() {
        MajorService majorService = new MajorService(majorRepository, degreeRequirementService, degreeRequirementRepository);

        Major major = new Major();
        major.setId(9L);
        major.setName("Software Engineering");
        major.setCollege(College.ENGINEERING);

        when(majorRepository.findByNameContainingIgnoreCaseOrderByNameAscCollegeAsc(eq("software"), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(major)));

        Page<MajorSummaryDTO> page = majorService.getMajorSummariesPage(-4, 500, "  software  ");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(majorRepository).findByNameContainingIgnoreCaseOrderByNameAscCollegeAsc(eq("software"), pageableCaptor.capture());

        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(200);
        assertThat(page.getContent())
                .extracting(MajorSummaryDTO::getId, MajorSummaryDTO::getName, MajorSummaryDTO::getCollege)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(9L, "Software Engineering", College.ENGINEERING));
    }
}

package com.sdmay19.courseflow.professor;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfessorServiceTest {

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private ProfessorExternalRatingRepository professorExternalRatingRepository;

    @Mock
    private ProfessorReviewRepository professorReviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfessorDirectoryState professorDirectoryState;

    private ProfessorService professorService;
    private Professor sampleProfessor;

    @BeforeEach
    void setUp() {
        professorService = new ProfessorService(
                professorRepository,
                professorExternalRatingRepository,
                professorReviewRepository,
                userRepository,
                professorDirectoryState);

        sampleProfessor = new Professor();
        sampleProfessor.setId(42L);
        sampleProfessor.setFullName("Jane Doe");
        sampleProfessor.setDepartment("Computer Science");
        sampleProfessor.setEmail("jdoe@iastate.edu");
        sampleProfessor.setProfileUrl("https://example.com/jane-doe");
    }

    @Test
    void browseProfessors_includesPrimaryExternalRatingInSummary() {
        ProfessorExternalRating externalRating = buildExternalRating(sampleProfessor);

        when(professorRepository.searchByName(eq(""), eq(""), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleProfessor), PageRequest.of(0, 25), 1));
        when(professorReviewRepository.findRatingStatsByProfessorIds(List.of(42L))).thenReturn(List.of());
        when(professorExternalRatingRepository.findByProfessorIdIn(List.of(42L))).thenReturn(List.of(externalRating));

        ProfessorBrowseResponse response = professorService.browseProfessors("", "", 0, 25, "name");

        assertThat(response.professors()).hasSize(1);
        ProfessorSummaryResponse summary = response.professors().getFirst();
        assertThat(summary.fullName()).isEqualTo("Jane Doe");
        assertThat(summary.primaryExternalRating()).isNotNull();
        assertThat(summary.primaryExternalRating().sourceLabel()).isEqualTo("Rate My Professors");
        assertThat(summary.primaryExternalRating().averageRating()).isEqualTo(4.4);
        assertThat(summary.primaryExternalRating().reviewCount()).isEqualTo(12);
    }

    @Test
    void browseProfessors_normalizesSearchTermsAndUsesRatingSortAlias() {
        Professor professor = new Professor();
        professor.setId(14L);
        professor.setFullName("Ada Lovelace");
        professor.setTitle("Professor");
        professor.setDepartment("Computer Science");
        professor.setEmail("ada@example.edu");
        professor.setProfileUrl("https://example.edu/ada");

        when(professorRepository.searchByRating(eq("ada"), eq("computer science"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(professor), PageRequest.of(0, 100), 1));
        when(professorReviewRepository.findRatingStatsByProfessorIds(List.of(14L)))
                .thenReturn(List.of(statsProjection(14L, 4.7, 12L)));
        when(professorExternalRatingRepository.findByProfessorIdIn(List.of(14L))).thenReturn(List.of());

        ProfessorBrowseResponse response = professorService.browseProfessors(
                "  Ada  ",
                " Computer Science ",
                -2,
                500,
                "top");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(professorRepository).searchByRating(eq("ada"), eq("computer science"), pageableCaptor.capture());

        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
        assertThat(response.sort()).isEqualTo("rating");
        assertThat(response.professors()).hasSize(1);
        assertThat(response.professors().getFirst().averageRating()).isEqualTo(4.7);
        assertThat(response.professors().getFirst().reviewCount()).isEqualTo(12L);
    }

    @Test
    void getProfessorDetail_returnsExternalRatingsAlongsideNativeReviewData() {
        ProfessorExternalRating externalRating = buildExternalRating(sampleProfessor);

        when(professorRepository.findById(42L)).thenReturn(Optional.of(sampleProfessor));
        when(professorReviewRepository.findRatingStatsByProfessorId(42L)).thenReturn(Optional.empty());
        when(professorReviewRepository.findRatingBreakdown(42L)).thenReturn(List.of());
        when(professorExternalRatingRepository.findByProfessorId(42L)).thenReturn(List.of(externalRating));

        ProfessorDetailResponse detail = professorService.getProfessorDetail(42L, null);

        assertThat(detail.id()).isEqualTo(42L);
        assertThat(detail.externalRatings()).hasSize(1);
        assertThat(detail.externalRatings().getFirst().sourceSystem()).isEqualTo("RATE_MY_PROFESSORS");
        assertThat(detail.externalRatings().getFirst().sourceUrl())
                .isEqualTo("https://www.ratemyprofessors.com/professor/1234567");
    }

    @Test
    void getProfessorReviews_anonymizesAnonymousReviewForNonOwnerViewer() {
        Professor professor = new Professor();
        professor.setId(50L);
        professor.setFullName("Ada Lovelace");

        AppUser reviewer = user(7L, "USER", "Ada", "Lovelace");
        AppUser viewer = user(8L, "USER", "Grace", "Hopper");

        ProfessorReview review = new ProfessorReview();
        review.setId(101L);
        review.setProfessor(professor);
        review.setReviewer(reviewer);
        review.setRating(5);
        review.setAnonymous(true);
        review.setCreatedAt(Instant.parse("2026-03-01T10:15:30Z"));
        review.setUpdatedAt(Instant.parse("2026-03-01T10:15:30Z"));

        when(professorRepository.findById(50L)).thenReturn(Optional.of(professor));
        when(userRepository.findById(8L)).thenReturn(Optional.of(viewer));
        when(professorReviewRepository.findByProfessorIdOrderByCreatedAtDesc(50L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(review), PageRequest.of(0, 20), 1));

        ProfessorReviewPageResponse response = professorService.getProfessorReviews(50L, viewer, 0, 20);

        assertThat(response.reviews()).hasSize(1);
        ProfessorReviewResponse mapped = response.reviews().getFirst();
        assertThat(mapped.reviewerId()).isNull();
        assertThat(mapped.reviewerDisplayName()).isEqualTo("Anonymous Student");
        assertThat(mapped.editableByCurrentUser()).isFalse();
    }

    @Test
    void importExternalRatingsFromDataset_matchesProfessorByNameAndDepartmentAndSavesSnapshot() {
        ProfessorExternalRatingImportDataset dataset = new ProfessorExternalRatingImportDataset(
                "RATE_MY_PROFESSORS",
                "2026-03-24T18:00:00Z",
                List.of(new ProfessorExternalRatingImportRecord(
                        null,
                        "Jane Doe",
                        "Computer Science",
                        "RATE_MY_PROFESSORS",
                        "1234567",
                        "https://www.ratemyprofessors.com/professor/1234567",
                        4.4,
                        12L,
                        2.8,
                        91,
                        "2026-03-24T18:00:00Z")));

        when(professorRepository.findFirstByNormalizedNameAndNormalizedDepartment("jane doe", "computer science"))
                .thenReturn(Optional.of(sampleProfessor));
        when(professorExternalRatingRepository.findByProfessorAndSourceSystem(sampleProfessor, "RATE_MY_PROFESSORS"))
                .thenReturn(Optional.empty());
        when(professorExternalRatingRepository.save(any(ProfessorExternalRating.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProfessorExternalRatingImportResponse response =
                professorService.importExternalRatingsFromDataset(dataset, true);

        assertThat(response.imported()).isEqualTo(1);
        assertThat(response.updated()).isZero();
        assertThat(response.invalid()).isZero();
        assertThat(response.unmatched()).isZero();

        ArgumentCaptor<ProfessorExternalRating> captor = ArgumentCaptor.forClass(ProfessorExternalRating.class);
        verify(professorExternalRatingRepository).save(captor.capture());
        ProfessorExternalRating saved = captor.getValue();
        assertThat(saved.getProfessor()).isSameAs(sampleProfessor);
        assertThat(saved.getSourceSystem()).isEqualTo("RATE_MY_PROFESSORS");
        assertThat(saved.getAverageRating()).isEqualTo(4.4);
        assertThat(saved.getReviewCount()).isEqualTo(12);
        assertThat(saved.getWouldTakeAgainPercent()).isEqualTo(91);
    }

    @Test
    void importExternalRatingsFromDataset_acceptsLinkOnlyRowsMatchedByUniqueName() {
        ProfessorExternalRatingImportDataset dataset = new ProfessorExternalRatingImportDataset(
                "RATE_MY_PROFESSORS",
                "2026-03-26T17:00:00Z",
                List.of(new ProfessorExternalRatingImportRecord(
                        null,
                        "Jane Doe",
                        null,
                        null,
                        "7654321",
                        "https://www.ratemyprofessors.com/professor/7654321",
                        null,
                        null,
                        null,
                        null,
                        null)));

        when(professorRepository.findAllByNormalizedName("jane doe")).thenReturn(List.of(sampleProfessor));
        when(professorExternalRatingRepository.findByProfessorAndSourceSystem(sampleProfessor, "RATE_MY_PROFESSORS"))
                .thenReturn(Optional.empty());
        when(professorExternalRatingRepository.save(any(ProfessorExternalRating.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProfessorExternalRatingImportResponse response =
                professorService.importExternalRatingsFromDataset(dataset, false);

        assertThat(response.imported()).isEqualTo(1);
        assertThat(response.updated()).isZero();
        assertThat(response.skipped()).isZero();
        assertThat(response.invalid()).isZero();
        assertThat(response.unmatched()).isZero();
    }

    @Test
    void upsertRateMyProfessorsLink_createsLinkOnlyRecordForProfessor() {
        when(professorRepository.findById(42L)).thenReturn(Optional.of(sampleProfessor));
        when(professorExternalRatingRepository.findByProfessorAndSourceSystem(sampleProfessor, "RATE_MY_PROFESSORS"))
                .thenReturn(Optional.empty());
        when(professorExternalRatingRepository.save(any(ProfessorExternalRating.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProfessorExternalRatingResponse response = professorService.upsertRateMyProfessorsLink(
                42L,
                "https://www.ratemyprofessors.com/professor/7654321");

        assertThat(response.sourceSystem()).isEqualTo("RATE_MY_PROFESSORS");
        assertThat(response.sourceLabel()).isEqualTo("Rate My Professors");
        assertThat(response.externalId()).isEqualTo("7654321");
        assertThat(response.averageRating()).isNull();
        assertThat(response.reviewCount()).isNull();
    }

    private ProfessorReviewRepository.RatingStatsProjection statsProjection(Long id, Double average, Long count) {
        return new ProfessorReviewRepository.RatingStatsProjection() {
            @Override public Long getProfessorId() { return id; }
            @Override public Double getAverageRating() { return average; }
            @Override public Long getReviewCount() { return count; }
        };
    }

    private ProfessorExternalRating buildExternalRating(Professor professor) {
        ProfessorExternalRating externalRating = new ProfessorExternalRating();
        externalRating.setProfessor(professor);
        externalRating.setSourceSystem("RATE_MY_PROFESSORS");
        externalRating.setExternalId("1234567");
        externalRating.setSourceUrl("https://www.ratemyprofessors.com/professor/1234567");
        externalRating.setAverageRating(4.4);
        externalRating.setReviewCount(12L);
        externalRating.setDifficultyRating(2.8);
        externalRating.setWouldTakeAgainPercent(91);
        return externalRating;
    }

    private AppUser user(long id, String role, String firstName, String lastName) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setRole(role);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(firstName.toLowerCase() + "@example.edu");
        return user;
    }
}

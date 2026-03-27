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
    private ProfessorReviewRepository professorReviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfessorDirectoryState professorDirectoryState;

    private ProfessorService professorService;

    @BeforeEach
    void setUp() {
        professorService = new ProfessorService(
                professorRepository,
                professorReviewRepository,
                userRepository,
                professorDirectoryState);
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
        assertThat(response.professors().get(0).averageRating()).isEqualTo(4.7);
        assertThat(response.professors().get(0).reviewCount()).isEqualTo(12L);
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
        ProfessorReviewResponse mapped = response.reviews().get(0);
        assertThat(mapped.reviewerId()).isNull();
        assertThat(mapped.reviewerDisplayName()).isEqualTo("Anonymous Student");
        assertThat(mapped.editableByCurrentUser()).isFalse();
    }

    private ProfessorReviewRepository.RatingStatsProjection statsProjection(Long id, Double average, Long count) {
        return new ProfessorReviewRepository.RatingStatsProjection() {
            @Override
            public Long getProfessorId() {
                return id;
            }

            @Override
            public Double getAverageRating() {
                return average;
            }

            @Override
            public Long getReviewCount() {
                return count;
            }
        };
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

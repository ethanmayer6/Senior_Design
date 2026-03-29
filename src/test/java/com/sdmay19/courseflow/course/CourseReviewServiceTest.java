package com.sdmay19.courseflow.course;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseReviewServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseReviewRepository courseReviewRepository;

    @Mock
    private UserRepository userRepository;

    private CourseReviewService courseReviewService;

    @BeforeEach
    void setUp() {
        courseReviewService = new CourseReviewService(courseRepository, courseReviewRepository, userRepository);
    }

    @Test
    void createCourseReview_trimsFieldsForStudentReviewer() {
        AppUser reviewer = user(7L, "USER", "Ada", "Lovelace");
        AppUser principal = new AppUser();
        principal.setId(7L);

        Course course = course(21L, "SE_4170");

        when(userRepository.findById(7L)).thenReturn(Optional.of(reviewer));
        when(courseRepository.findById(21L)).thenReturn(Optional.of(course));
        when(courseReviewRepository.existsByCourseAndReviewer(course, reviewer)).thenReturn(false);
        when(courseReviewRepository.save(any(CourseReview.class))).thenAnswer(invocation -> {
            CourseReview saved = invocation.getArgument(0);
            saved.setId(91L);
            saved.setCreatedAt(Instant.parse("2026-03-01T10:15:30Z"));
            saved.setUpdatedAt(saved.getCreatedAt());
            return saved;
        });

        CourseReviewResponse response = courseReviewService.createCourseReview(
                21L,
                new CourseReviewRequest(
                        5,
                        4,
                        3,
                        true,
                        "  Fall 2025  ",
                        "  Prof. Lovelace  ",
                        " A ",
                        " Helpful labs ",
                        null,
                        null,
                        " Start projects early ",
                        true),
                principal);

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.semesterTaken()).isEqualTo("Fall 2025");
        assertThat(response.instructorName()).isEqualTo("Prof. Lovelace");
        assertThat(response.gradeReceived()).isEqualTo("A");
        assertThat(response.positives()).isEqualTo("Helpful labs");
        assertThat(response.studyTips()).isEqualTo("Start projects early");
        assertThat(response.anonymous()).isTrue();
        assertThat(response.reviewerDisplayName()).isEqualTo("Ada Lovelace");
        assertThat(response.editableByCurrentUser()).isTrue();
    }

    @Test
    void getCourseReviews_anonymizesAnonymousReviewForOtherStudents() {
        AppUser viewer = user(20L, "USER", "Grace", "Hopper");
        AppUser reviewer = user(7L, "USER", "Ada", "Lovelace");
        Course course = course(21L, "SE_4170");

        CourseReview review = new CourseReview();
        review.setId(101L);
        review.setCourse(course);
        review.setReviewer(reviewer);
        review.setRating(4);
        review.setAnonymous(true);
        review.setCreatedAt(Instant.parse("2026-03-01T10:15:30Z"));
        review.setUpdatedAt(Instant.parse("2026-03-01T10:15:30Z"));

        when(courseRepository.findById(21L)).thenReturn(Optional.of(course));
        when(userRepository.findById(20L)).thenReturn(Optional.of(viewer));
        when(courseReviewRepository.findByCourseIdOrderByCreatedAtDesc(21L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(review), PageRequest.of(0, 20), 1));

        CourseReviewPageResponse page = courseReviewService.getCourseReviews(21L, viewer, 0, 20);

        assertThat(page.reviews()).hasSize(1);
        CourseReviewResponse response = page.reviews().get(0);
        assertThat(response.reviewerId()).isNull();
        assertThat(response.reviewerDisplayName()).isEqualTo("Anonymous Student");
        assertThat(response.editableByCurrentUser()).isFalse();
    }

    @Test
    void createCourseReview_rejectsAdvisorAccounts() {
        AppUser advisor = user(8L, "ADVISOR", "Faculty", "Advisor");
        AppUser principal = new AppUser();
        principal.setId(8L);

        when(userRepository.findById(8L)).thenReturn(Optional.of(advisor));

        assertThatThrownBy(() -> courseReviewService.createCourseReview(
                21L,
                new CourseReviewRequest(5, null, null, null, null, null, null, null, null, null, null, false),
                principal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only student users");
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

    private Course course(long id, String ident) {
        Course course = new Course();
        course.setId(id);
        course.setCourseIdent(ident);
        course.setName(ident);
        course.setCredits(3);
        course.setPrerequisites(java.util.Set.of());
        course.setDescription("desc");
        course.setOffered("Fall");
        return course;
    }
}

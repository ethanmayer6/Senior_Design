package com.sdmay19.courseflow.course;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class CourseRepositoryIntegrationTest {

    @Autowired
    private CourseRepository courseRepository;

    @Test
    void repositoryQueriesRoundTripPersistedCourses() {
        courseRepository.saveAll(List.of(
                course("Computer Organization", "COMS_2270", Set.of("COMS_2280")),
                course("Software Development Practices", "SE_3190", Set.of("COMS_2270")),
                course("Human Computer Interaction", "SE_3170", Set.of())
        ));

        assertThat(courseRepository.findByCourseIdent("COMS_2270"))
                .isPresent()
                .get()
                .extracting(Course::getName, Course::getPrerequisites)
                .containsExactly("Computer Organization", Set.of("COMS_2280"));

        assertThat(courseRepository.findByCourseIdentContainingIgnoreCase("se_3"))
                .extracting(Course::getCourseIdent)
                .containsExactlyInAnyOrder("SE_3190", "SE_3170");

        assertThat(courseRepository.findAllByCourseIdentIn(List.of("COMS_2270", "SE_3170")))
                .extracting(Course::getCourseIdent)
                .containsExactlyInAnyOrder("COMS_2270", "SE_3170");
    }

    private Course course(String name, String courseIdent, Set<String> prerequisites) {
        Course course = new Course();
        course.setName(name);
        course.setCourseIdent(courseIdent);
        course.setCredits(3);
        course.setPrereq_txt(prerequisites.isEmpty() ? null : String.join(", ", prerequisites));
        course.setPrerequisites(prerequisites);
        course.setDescription(name + " description");
        course.setHours("3");
        course.setOffered("Fall");
        return course;
    }
}

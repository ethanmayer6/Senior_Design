package com.sdmay19.courseflow.course;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByName(String name);
    Optional<Course> findByCourseIdent(String courseIdent);
}
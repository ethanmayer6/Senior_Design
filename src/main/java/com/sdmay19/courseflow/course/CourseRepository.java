package com.sdmay19.courseflow.course;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByName(String name);
    Optional<Course> findByCourseIdent(String courseIdent);
    Optional<Course> findById(long id);
    List<Course> findAllByCourseIdent(List<String> courseIdents);
}
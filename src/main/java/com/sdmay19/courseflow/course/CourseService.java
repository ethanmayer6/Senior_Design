package com.sdmay19.courseflow.course;
import com.sdmay19.courseflow.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.lang.String;



@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional
    public List<Course> createAll(List<Course> courses) {
        // Validate all courses first
        for (Course course : courses) {
            if (!requiredFields(course)) throw new CourseCreationException("Required fields not present in course. Please check name and description exist");
            if (courseRepository.findByCourseIdent(course.getCourseIdent()).isPresent()) throw new CourseCreationException("Course with this courseIdent already exists: " + course.getCourseIdent());

            course.getPrerequisites().remove(course.getCourseIdent());
        }
        return courseRepository.saveAll(courses);
    }

    @Transactional
    public Course create(Course course) {
        if(!requiredFields(course)) throw new CourseCreationException("Required fields not present in course. Please check name and description exist");
        if(courseRepository.findByCourseIdent(course.getCourseIdent()).isPresent()) throw new CourseCreationException("Course with this name already exists");

        course.getPrerequisites().remove(course); // Prevent self prequisite loop
        return courseRepository.save(course);
    }
    public boolean requiredFields(Course course) {
        return !(course.getName() == null || course.getName() == ""
                || course.getDescription() == null || course.getDescription() == ""
                || course.getCourseIdent() == null || course.getCourseIdent() == "");
    }

    public Course getById(long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Course with id: " + id + "not found"));
    }
    public List<Course> getAllById(List<Long> ids) {
        List<Course> courses = courseRepository.findAllById(ids);
        if(courses.isEmpty()) {
            throw new CourseNotFoundException("Group of courses could not be found");
        }
        return courses;
    }
    public Course getByName(String name) {
        return courseRepository.findByName(name)
                .orElseThrow(() -> new CourseNotFoundException("Course with name: " + name + "not found"));
    }
    public Course getByCourseIdent(String courseIdent) {
        return courseRepository.findByCourseIdent(courseIdent)
                .orElseThrow(() -> new CourseNotFoundException("Course with id: " + courseIdent + "not found"));
    }
    public List<Course> getAllCourse() {
        return courseRepository.findAll();
    }
    
    @Transactional
    public Course updateCourse(CourseUpdater updator) {
        Course course = getByCourseIdent(updator.getIdent());
        String courseIdent = course.getCourseIdent();

        if(updator.getName() != null){
            course.setName(updator.getName());
        }
        if(updator.getIdent() != null){
            course.setCourseIdent(updator.getIdent());
        }
        if(updator.getCredits() != null){
            course.setCredits(updator.getCredits());
        }
        if(updator.getPrereq_txt() != null){
            course.setPrereq_txt(updator.getPrereq_txt());
        }
        if(updator.getDescription() != null){
            course.setDescription(updator.getDescription());
        }
        if(updator.getHours() != null){
            course.setHours(updator.getHours());
        }
        if(updator.getOffered() != null){
            course.setOffered(updator.getOffered());
        }

        // Update Prerequisites
        List<String> courseIdents = updator.getPrereqIdents();

        if(courseIdents != null){
            // Course can not be a prerequisite to itself
            if (courseIdents.contains(courseIdent)) {
                throw new CourseUpdateException("A course cannot list itself as a prerequisite.");
            }
            // Get All Prerequisite Courses
            List<Course> prereqCourses = courseRepository.findAllByCourseIdentIn(courseIdents);
            if(prereqCourses.size() != courseIdents.size()) {
                throw new CourseUpdateException("Prerequisite courses not found, got some or none, but not all: " + prereqCourses);
            }
            // Check for Prerequisite Cycle
            for(Course c : prereqCourses) {
                if(c.getPrerequisites().contains(courseIdent)) {
                    throw new CourseUpdateException("Cycle detected: course " + c.getCourseIdent() + " lists this course as a prereq");
                }
            }

            // Update with New Prerequisites (set of Ids)
            course.setPrerequisites(new HashSet<>(courseIdents));
        }

        // Save all Updates
        return courseRepository.save(course);
    }

    @Transactional
    public void deleteById(long id) {
        Course c = getById(id);
        courseRepository.delete(c);
    }

}
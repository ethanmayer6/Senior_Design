package com.sdmay19.courseflow.course;
import com.sdmay19.courseflow.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    public Course create(Course course) {
        if(!requiredFields(course)) throw new CourseCreationException("Required fields not present in course. Please check name and description exist");
        course.getPrerequisites().remove(course); // Prevents self addition to prereqs

        return courseRepository.save(course);
    }
    public boolean requiredFields(Course course) {
        return !(course.getName() == null || course.getName() == "" || course.getDescription() == null || course.getDescription() == "");
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
    public Course updateCourse(long id, CourseUpdater updator) {
        Course course = getById(id);

        if(updator.getName() != null){
            course.setName(updator.getName());
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
        List<Long> courseIds = updator.getPrereqIds();

        if(courseIds != null){
            // Course can not be a prerequisite to itself
            if (courseIds.contains(id)) {
                throw new CourseUpdateException("A course cannot list itself as a prerequisite.");
            }
            // Get All Prerequisite Courses
            List<Course> courses = getAllById(courseIds);
            if(courses.size() != courseIds.size()) {
                throw new CourseUpdateException("Prerequisite courses not found, got some or none, but not all: " + courses);
            }
            // Check for Prerequisite Cycle
            for(Course c : courses) {
                if(c.getPrerequisites().contains(id)) {
                    throw new CourseUpdateException("Cycle detected: course " + c.getCourseIdent() + " lists this course as a prereq");
                }
            }

            // Update with New Prerequisites (set of Ids)
            course.setPrerequisites(new HashSet<>(courseIds));
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
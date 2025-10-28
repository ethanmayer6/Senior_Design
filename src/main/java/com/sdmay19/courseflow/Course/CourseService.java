package com.sdmay19.courseflow.course;
import com.sdmay19.courseflow.exception.BadRequestException;
import com.sdmay19.courseflow.exception.CourseNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class CourseService {

private final CourseRepository courseRepository;



    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Override
    @Transactional
    public Course create(Course c) {

        if(c.getName() == null || c.getName() == ""){
            throw new BadRequestException("Course name is required");
        }
        if(c.getDescription() == null || c.getDescription() == ""){
            throw new BadRequestException("Course description is required");
        }
        if(c.getCredits() == null){
            throw new BadRequestException("Course credits are required")
        }

        //This prevents if the course object has itself as a prereq
        c.getPrerequisites().remove(c);


        return courseRepository.save(c);
    }

    @Override
    @Transactional(readOnly = true)
    public Course getCourseById(long id) {
        return courseRepository.findById(id);
    }

    @Override
    public Course getCourseByName(String name) {
        return courseRepository.findByName(name);
    }

    @Override
    public Course getCourseByCourseIdent(String courseIdent) {
        return courseRepository.findByCourseIdent(courseIdent);
    }


    @Override
    @Transactional
    public Course updateCourse(long id, CourseUpdator u) {


        Course course = getCourseById(id);

        if(u.getName() != null){
            course.setName(u.getName());
        }
        if(u.getCredits() != null){
            course.setCredits(u.getCredits());
        }
        if(u.getPrereq_txt() != null){
            course.setPrereq_txt(u.getPrereq_txt());
        }
        if(u.getDescription() != null){
            course.setDescription(u.getDescription());
        }
        if(u.getHours() != null){
            course.setHours(u.getHours());
        }
        if(u.getOffered() != null){
            course.setOffered(u.getOffered());
        }


        //Relationship update
        List<Long> ids = u.getPrereqIds();
        if(ids != null){
            
            //Prevent self prereq
            if (ids.contains(id)) throw new BadRequestException("A course cannot list itself as a prerequisite.");


            List<Course> found = courseRepository.findAllById(ids);


            if(found.size() != ids.size()){
                throw new CourseNotFoundException("Prerequisite courses not found, got some or none, but not all: " + found);
            }

            for(Course c : found) {
                if(c.getPrerequisites().contains(course)) {
                    throw new BadRequestException("Cycle detected: course " + c.getCourseIdent() + " lists this course as a prereq");
                }
            }

            course.setPrerequisites(new HashSet<>(found));
        }

        return courseRepository.save(course);
    }

    @Override
    @Transactional
    public void deleteById(long id) {
        Course c = getCourseById(id);
        courseRepository.delete(c);
    }
}
package com.sdmay19.courseflow.course;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;
import java.lang.String;
import java.lang.Integer;
import java.lang.Exception;
import org.springframework.stereotype.Service;

import com.sdmay19.courseflow.exception.AuthenticationFailedException;
import com.sdmay19.courseflow.exception.UserNotFoundException;
import com.sdmay19.courseflow.security.AuthResponse;
import com.sdmay19.courseflow.security.JwtService;


@Service
public class CourseService {

private final CourseRepository courseRepository;



    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional
    public Course create(Course c) {

        if(c.getName() == null || c.getName() == ""){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course name is required");
        }
        if(c.getDescription() == null || c.getDescription() == ""){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course description is required");
        }


        //This prevents if the course object has itself as a prereq
        c.getPrerequisites().remove(c);


        return courseRepository.save(c);
    }

    @Transactional(readOnly = true)
    public Optional<Course> getCourseById(long id) {
        return courseRepository.findById(id);
    }

    public Optional<Course> getCourseByName(String name) {
        return courseRepository.findByName(name);
    }

    public Optional<Course> getCourseByCourseIdent(String courseIdent) {
        return courseRepository.findByCourseIdent(courseIdent);
    }

    @Transactional(readOnly = true)
    public List<Course> getAll() {
        return courseRepository.findAll();
    }


    @Transactional
    public Course updateCourse(long id, CourseUpdater u) {


        Course course = getCourseById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course not found: " + id));

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
            if (ids.contains(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A course cannot list itself as a prerequisite.");


            List<Course> found = courseRepository.findAllById(ids);


            if(found.size() != ids.size()){
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prerequisite courses not found, got some or none, but not all: " + found);
            }

            for(Course c : found) {
                if(c.getPrerequisites().contains(course)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle detected: course " + c.getCourseIdent() + " lists this course as a prereq");
                }
            }

            course.setPrerequisites(new HashSet<>(found));
        }

        return courseRepository.save(course);
    }

    @Transactional
    public void deleteById(long id) {
        Course c = getCourseById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Course not found: " + id));
        courseRepository.delete(c);
    }
}
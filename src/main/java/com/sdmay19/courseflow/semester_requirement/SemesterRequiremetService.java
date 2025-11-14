package com.sdmay19.courseflow.semester_requirement;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SemesterRequiremetService {

    // TODO - ADD REST OF CRUD OPERATIONS

    private final SemesterRequirementRepository semesterRequirementRepository;
    private final CourseRepository courseRepository;

    public SemesterRequiremetService(SemesterRequirementRepository semesterRequirementRepository, CourseRepository courseRepository) {
        this.semesterRequirementRepository = semesterRequirementRepository;
        this.courseRepository = courseRepository;
    }

    // CREATE
    public SemesterRequirement createFromDTO(SemesterRequirementDTO dto) {
        SemesterRequirement saved = buildFromDTO(dto);
        return semesterRequirementRepository.save(saved);
    }
    public SemesterRequirement buildFromDTO(SemesterRequirementDTO dto) {
        List<Course> courses = getCourses(dto);
        return new SemesterRequirement(dto.getIdent(), dto.getSatisfyingCredits(), courses);
    }
    public List<Course> getCourses(SemesterRequirementDTO dto) {
        List<String> courseIdents = dto.getCourseIdents();
        return courseRepository.findAllByCourseIdentIn(courseIdents);
    }

    // READ

    // UPDATE

    // DELETE
}

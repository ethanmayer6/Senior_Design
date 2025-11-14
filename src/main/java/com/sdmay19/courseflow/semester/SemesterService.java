package com.sdmay19.courseflow.semester;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.flowchart.FlowChartRepository;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.semester_requirement.SemesterRequirement;
import com.sdmay19.courseflow.semester_requirement.SemesterRequirementRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SemesterService {

    // TODO - ADD REST OF CRUD OPERATIONS
    private final SemesterRepository semesterRepository;
    private final FlowChartRepository flowChartRepository;
    private final CourseRepository courseRepository;

    public SemesterService (SemesterRepository semesterRepository, FlowChartRepository flowChartRepository, CourseRepository courseRepository) {
        this.semesterRepository = semesterRepository;
        this.flowChartRepository = flowChartRepository;
        this.courseRepository = courseRepository;
    }

    // CREATE
    public Semester createFromDTO(SemesterDTO dto) {
        Semester saved = buildFromDTO(dto);
        return semesterRepository.save(saved);
    }
    public Semester buildFromDTO(SemesterDTO dto) {
        return new Semester(dto.getYear(), dto.getTerm(), dto.getMajor(), getFlowchart(dto), getCourses(dto));
    }
    public Flowchart getFlowchart(SemesterDTO dto) {
        // TODO - ADD CUSTOM ERROR
        return flowChartRepository.findById(dto.getFlowchartId())
                .orElseThrow(() -> new IllegalArgumentException("Flowchart not found"));
    }
    public List<Course> getCourses(SemesterDTO dto) {
        return courseRepository.findAllByCourseIdentIn(dto.getCourseIdents());
    }

    // READ

    // UPDATE

    // DELETE

}

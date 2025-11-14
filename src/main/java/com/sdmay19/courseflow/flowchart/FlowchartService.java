package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.User.UserService;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import com.sdmay19.courseflow.flowchart.CourseMapRequest;
import com.sdmay19.courseflow.semester.CourseUpdateRequest;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Flow;

@Service
public class FlowchartService {

    private final CourseRepository courseRepository;
    private FlowChartRepository flowChartRepository;
    private SemesterRepository semesterRepository;
    private UserRepository userRepository;

    public FlowchartService(FlowChartRepository flowChartRepository, SemesterRepository semesterRepository, UserRepository userRepository, CourseRepository courseRepository) {
        this.flowChartRepository = flowChartRepository;
        this.semesterRepository = semesterRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    // CREATE
    public Flowchart createFromDTO(FlowchartDTO dto) {
        Flowchart saved = buildFromDTO(dto);
        return flowChartRepository.save(saved);
    }
    public Flowchart buildFromDTO(FlowchartDTO dto) {
        List<Semester> semesters = getSemesters(dto);
        AppUser user = getUser(dto);
        return new Flowchart(dto.getTotalCredits(), dto.getCreditsSatisfied(), dto.getTitle(), user, semesters, dto.getCourseStatusMap());
    }
    public List<Semester> getSemesters (FlowchartDTO dto) {
        return semesterRepository.findAllByIdentIn(dto.getSemesterIdents());
    }
    public AppUser getUser(FlowchartDTO dto) {
        return userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new UserNotFoundException("User with id " + dto.getUserId() + " not found"));
    }

    // READ
    public Flowchart getById(long id) {
        return flowChartRepository.findById(id)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with Id " + id + " not Found."));
    }
    public List<Course> getCourseByStatus(long flowchartId, Status status) {
        Flowchart flowchart = getById(flowchartId);
        Map<String, Status> courseMap = flowchart.getCourseStatusMap();
        List<Course> result = new ArrayList<>();

        for (Map.Entry<String, Status> entry : courseMap.entrySet()) {
            String courseIdent = entry.getKey();
            Status curStatus = entry.getValue();

            if (status == curStatus) {
                Course course = courseRepository.findByCourseIdent(courseIdent)
                        .orElseThrow(() -> new CourseNotFoundException("Course with ident " + courseIdent + " not found."));

                result.add(course);
            }
        }
        return result;
    }

    // UPDATE
    @Transactional
    public void addCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        Map<String, Status> map = flowchart.getCourseStatusMap();
        if (map.containsKey(ident)) {
            throw new IllegalArgumentException("Course already mapped in flowchart");
        }
        map.put(ident, status);
    }

    @Transactional
    public void removeCourse(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in map");
        }
        map.remove(ident);
    }

    @Transactional
    public void updateCourseStatus(long flowchartId, CourseMapRequest request) {
        Flowchart flowchart = getById(flowchartId);
        String ident = request.getCourseIdent();
        Status status = request.getStatus();

        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        Map<String, Status> map = flowchart.getCourseStatusMap();

        if (!map.containsKey(ident)) {
            throw new CourseNotFoundException("Course " + ident + " not found in status map");
        }
        map.put(ident, status);
    }
    public Flowchart getByUser(AppUser user) {
        return flowChartRepository.findByUser(user)
                .orElseThrow(() -> new FlowchartNotFoundException("Flowchart with user not found"));
    }

    // DELETE
    public void deleteById(long id) {
        flowChartRepository.deleteById(id);
    }
}

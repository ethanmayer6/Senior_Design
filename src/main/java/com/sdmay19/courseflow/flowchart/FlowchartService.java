package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserRepository;
import com.sdmay19.courseflow.semester.Semester;
import com.sdmay19.courseflow.semester.SemesterRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.Flow;

@Service
public class FlowchartService {

    private FlowChartRepository flowChartRepository;
    private SemesterRepository semesterRepository;
    private UserRepository userRepository;

    public FlowchartService(FlowChartRepository flowChartRepository, SemesterRepository semesterRepository) {
        this.flowChartRepository = flowChartRepository;
        this.semesterRepository = semesterRepository;
    }

    public Flowchart createFromDTO(FlowchartDTO dto) {
        Flowchart saved = buildFromDTO(dto);
        return flowChartRepository.save(saved);
    }
    public Flowchart buildFromDTO(FlowchartDTO dto) {
        List<Semester> semesters = getSemesters(dto);
        AppUser user = getUser(dto);
        return new Flowchart(dto.getTotalCredits(), dto.getCreditsSatisfied(), dto.getTitle(), user, semesters);
    }
    public List<Semester> getSemesters (FlowchartDTO dto) {
        return semesterRepository.findAllByIdentIn(dto.getSemesterIdents());
    }
    public AppUser getUser(Flowchart dto) {
        return userRepository.findById(dto.getUserId());
    }
}

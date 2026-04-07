package com.sdmay19.courseflow.schedule;

import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.semester.Term;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassScheduleEntryRepository extends JpaRepository<ClassScheduleEntry, Long> {
    List<ClassScheduleEntry> findAllByFlowchartOrderByYearAscTermAscMeetingStartTimeAsc(Flowchart flowchart);
    List<ClassScheduleEntry> findAllByFlowchartAndYearAndTermOrderByMeetingStartTimeAsc(Flowchart flowchart, int year, Term term);
    void deleteAllByFlowchartAndYearAndTermAndEntryType(
            Flowchart flowchart,
            int year,
            Term term,
            ClassScheduleEntryType entryType);
}

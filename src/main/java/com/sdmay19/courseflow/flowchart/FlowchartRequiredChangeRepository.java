package com.sdmay19.courseflow.flowchart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlowchartRequiredChangeRepository extends JpaRepository<FlowchartRequiredChange, Long> {
    List<FlowchartRequiredChange> findAllByFlowchartOrderByCreatedAtAsc(Flowchart flowchart);
}

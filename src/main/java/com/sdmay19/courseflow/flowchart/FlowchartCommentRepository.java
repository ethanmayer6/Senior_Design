package com.sdmay19.courseflow.flowchart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlowchartCommentRepository extends JpaRepository<FlowchartComment, Long> {
    List<FlowchartComment> findAllByFlowchartOrderByUpdatedAtDesc(Flowchart flowchart);
}

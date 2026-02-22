package com.sdmay19.courseflow.flowchart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FlowchartCommentRepository extends JpaRepository<FlowchartComment, Long> {
    List<FlowchartComment> findAllByFlowchartOrderByCreatedAtAsc(Flowchart flowchart);
    Optional<FlowchartComment> findByIdAndFlowchart(long id, Flowchart flowchart);
}

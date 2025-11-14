package com.sdmay19.courseflow.flowchart;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flowchart")
public class FlowchartController {

    private final FlowchartService flowchartService;

    public FlowchartController (FlowchartService flowchartService) {
        this.flowchartService = flowchartService;
    }

    // CREATE
    @PostMapping()
    public ResponseEntity<Flowchart> createFlowchart (FlowchartDTO dto) {
        Flowchart flowchart = flowchartService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(flowchart);
    }

    // READ

    // UPDATE

    // DELETE
}

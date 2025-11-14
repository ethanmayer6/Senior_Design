package com.sdmay19.courseflow.semester;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/semester")
public class SemesterController {

    private final SemesterService semesterService;

    public SemesterController(SemesterService semesterService) {
        this.semesterService = semesterService;
    }

    // CREATE
    @PostMapping("/create")
    public ResponseEntity<Semester> createSemester(SemesterDTO dto) {
        Semester semester = semesterService.createFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(semester);
    }

    // READ

    // UPDATE

    // DELETE

}

package com.sdmay19.courseflow.importer;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/progressReport")
public class AcademicProgressController {

    private final AcademicProgressService academicProgressService;

    public AcademicProgressController(AcademicProgressService academicProgressService) {
        this.academicProgressService = academicProgressService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAcademicProgress(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file uploaded.");
        }

        try {
            AcademicProgressService.StudentProgressResult result =
                    academicProgressService.processProgress(file);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to process academic progress: " + e.getMessage());
        }
    }

    @PostMapping("/flowchart")
public ResponseEntity<?> generateFlowchart(@RequestParam("file") MultipartFile file) {
    try {
        var result = academicProgressService.buildFlowchartFromProgress(file);
        return ResponseEntity.ok(result);
    } catch (Exception e) {
        e.printStackTrace();  // <-- ADD THIS
        return ResponseEntity.internalServerError()
                .body("Failed generating flowchart: " + e.getMessage());
    }
}
}
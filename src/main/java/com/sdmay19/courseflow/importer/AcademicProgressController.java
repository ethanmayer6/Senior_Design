// src/main/java/com/sdmay19/courseflow/importer/AcademicProgressController.java
package com.sdmay19.courseflow.importer;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.importer.AcademicProgressService.FlowchartResult;

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
            AcademicProgressService.StudentProgressResult result = academicProgressService.processProgress(file);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to process academic progress: " + e.getMessage());
        }
    }

    @PostMapping("/flowchart")
    public ResponseEntity<?> generateFlowchart(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            AppUser user = (AppUser) auth.getPrincipal();

            // 1 — Build the flowchart projection (for debugging / future use)
            FlowchartResult graph = academicProgressService.buildFlowchartFromProgress(file);

            // 2 — Save the full flowchart (with semesters) to DB
            Flowchart saved = academicProgressService.createFlowchartFromProgress(file, user);

            // 3 — Return whatever you prefer; frontend will just care about success
            return ResponseEntity.ok(graph); // or 'saved'

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Failed generating flowchart: " + e.getMessage());
        }
    }
}
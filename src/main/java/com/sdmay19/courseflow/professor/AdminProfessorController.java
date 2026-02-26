package com.sdmay19.courseflow.professor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/professors")
public class AdminProfessorController {

    private final ProfessorService professorService;

    public AdminProfessorController(ProfessorService professorService) {
        this.professorService = professorService;
    }

    @PostMapping("/import")
    public ResponseEntity<ProfessorImportResponse> importFromPayload(
            @RequestBody ProfessorImportDataset dataset,
            @RequestParam(defaultValue = "true") boolean overwrite) {
        ProfessorImportResponse response = professorService.importFromDataset(dataset, overwrite);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/import/file")
    public ResponseEntity<ProfessorImportResponse> importFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "true") boolean overwrite) {
        ProfessorImportResponse response = professorService.importFromJsonFile(file, overwrite);
        return ResponseEntity.ok(response);
    }
}

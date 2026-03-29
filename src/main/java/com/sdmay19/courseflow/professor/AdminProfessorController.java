package com.sdmay19.courseflow.professor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @PostMapping("/external-ratings/import")
    public ResponseEntity<ProfessorExternalRatingImportResponse> importExternalRatingsFromPayload(
            @RequestBody ProfessorExternalRatingImportDataset dataset,
            @RequestParam(defaultValue = "true") boolean overwrite) {
        ProfessorExternalRatingImportResponse response =
                professorService.importExternalRatingsFromDataset(dataset, overwrite);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/external-ratings/import/file")
    public ResponseEntity<ProfessorExternalRatingImportResponse> importExternalRatingsFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "true") boolean overwrite) {
        ProfessorExternalRatingImportResponse response =
                professorService.importExternalRatingsFromJsonFile(file, overwrite);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{professorId}/rate-my-professors-link")
    public ResponseEntity<ProfessorExternalRatingResponse> upsertRateMyProfessorsLink(
            @PathVariable long professorId,
            @RequestBody ProfessorRateMyProfessorsLinkRequest request) {
        ProfessorExternalRatingResponse response = professorService.upsertRateMyProfessorsLink(
                professorId,
                request == null ? null : request.sourceUrl());
        return ResponseEntity.ok(response);
    }
}

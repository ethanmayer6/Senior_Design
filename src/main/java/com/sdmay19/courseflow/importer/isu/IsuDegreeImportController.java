package com.sdmay19.courseflow.importer.isu;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/majors/isu")
public class IsuDegreeImportController {
    private final IsuDegreeImportService importService;
    private final ObjectMapper objectMapper;

    public IsuDegreeImportController(IsuDegreeImportService importService, ObjectMapper objectMapper) {
        this.importService = importService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/import")
    public ResponseEntity<IsuDegreeImportResult> importJson(@RequestBody IsuDegreeDataset dataset) {
        IsuDegreeImportResult result = importService.importDataset(dataset);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/import/file")
    public ResponseEntity<IsuDegreeImportResult> importJsonFile(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        IsuDegreeDataset dataset = objectMapper.readValue(file.getInputStream(), IsuDegreeDataset.class);
        IsuDegreeImportResult result = importService.importDataset(dataset);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/import/courses/file")
    public ResponseEntity<IsuDegreeImportResult> importCoursesOnlyFile(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        IsuDegreeDataset dataset = objectMapper.readValue(file.getInputStream(), IsuDegreeDataset.class);
        IsuDegreeImportResult result = importService.importCoursesOnly(dataset);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/import/majors/file")
    public ResponseEntity<IsuDegreeImportResult> importMajorsOnlyFile(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        IsuDegreeDataset dataset = objectMapper.readValue(file.getInputStream(), IsuDegreeDataset.class);
        IsuDegreeImportResult result = importService.importMajorsOnly(dataset);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/template")
    public IsuDegreeDataset template() {
        IsuDegreeDataset.CourseImport course = new IsuDegreeDataset.CourseImport(
                "COM_S_3090",
                "Software Development Practices",
                4,
                "COM S 2270",
                java.util.Set.of("COM_S_2270"),
                "Introductory software development course.",
                "Rec 3, Lab 2",
                "FALL, SPRING");

        IsuDegreeDataset.RequirementGroupImport group = new IsuDegreeDataset.RequirementGroupImport(
                "SE Technical Electives",
                6,
                java.util.List.of("COM_S_3090"));

        IsuDegreeDataset.DegreeRequirementImport requirement = new IsuDegreeDataset.DegreeRequirementImport(
                "SE Core",
                37,
                java.util.List.of("COM_S_3090"),
                java.util.List.of(group));

        IsuDegreeDataset.MajorImport major = new IsuDegreeDataset.MajorImport(
                "Software Engineering",
                "ENGINEERING",
                "Sample import payload for CourseFlow.",
                java.util.List.of(requirement));

        return new IsuDegreeDataset(
                "Iowa State University Catalog",
                "2026-2027",
                java.util.List.of(course),
                java.util.List.of(major));
    }
}

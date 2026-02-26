package com.sdmay19.courseflow.importer.isu;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/majors/isu")
public class IsuDegreeImportController {
    private final IsuDegreeImportService importService;
    private final IsuImportJobService importJobService;
    private final ObjectMapper objectMapper;

    public IsuDegreeImportController(
            IsuDegreeImportService importService,
            IsuImportJobService importJobService,
            ObjectMapper objectMapper) {
        this.importService = importService;
        this.importJobService = importJobService;
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

    @PostMapping("/import/file/async")
    public ResponseEntity<IsuImportJobResponse> importJsonFileAsync(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "ALL") IsuImportMode mode,
            @RequestParam(value = "chunkSize", defaultValue = "100") int chunkSize) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        IsuDegreeDataset dataset = objectMapper.readValue(file.getInputStream(), IsuDegreeDataset.class);
        IsuImportJobResponse response = importJobService.startJob(dataset, mode, chunkSize);
        return ResponseEntity.accepted().body(response);
    }

    @PostMapping("/import/local")
    public ResponseEntity<IsuDegreeImportResult> importLocalDataset(
            @RequestParam(value = "path", required = false) String path,
            @RequestParam(value = "mode", defaultValue = "ALL") IsuImportMode mode) throws Exception {
        IsuDegreeDataset dataset = readDatasetFromServerPath(path);
        IsuDegreeImportResult result = switch (mode == null ? IsuImportMode.ALL : mode) {
            case MAJORS_ONLY -> importService.importMajorsOnly(dataset);
            case COURSES_ONLY -> importService.importCoursesOnly(dataset);
            case ALL -> importService.importDataset(dataset);
        };
        return ResponseEntity.ok(result);
    }

    @PostMapping("/import/local/async")
    public ResponseEntity<IsuImportJobResponse> importLocalDatasetAsync(
            @RequestParam(value = "path", required = false) String path,
            @RequestParam(value = "mode", defaultValue = "ALL") IsuImportMode mode,
            @RequestParam(value = "chunkSize", defaultValue = "100") int chunkSize) throws Exception {
        IsuDegreeDataset dataset = readDatasetFromServerPath(path);
        IsuImportJobResponse response = importJobService.startJob(dataset, mode, chunkSize);
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/import/jobs/{jobId}")
    public ResponseEntity<IsuImportJobResponse> getImportJob(@PathVariable String jobId) {
        return ResponseEntity.ok(importJobService.getJob(jobId));
    }

    @PostMapping("/import/jobs/{jobId}/retry")
    public ResponseEntity<IsuImportJobResponse> retryFailedChunks(@PathVariable String jobId) {
        return ResponseEntity.accepted().body(importJobService.retryFailedChunks(jobId));
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

    private IsuDegreeDataset readDatasetFromServerPath(String requestedPath) throws Exception {
        Path workspaceRoot = Paths.get("").toAbsolutePath().normalize();
        List<Path> candidates = new ArrayList<>();

        if (requestedPath != null && !requestedPath.isBlank()) {
            candidates.add(workspaceRoot.resolve(requestedPath).normalize());
        }
        candidates.add(workspaceRoot.resolve("docs/isu-degree-dataset.json").normalize());
        candidates.add(workspaceRoot.resolve("src/main/resources/static/isu-degree-dataset.json").normalize());

        for (Path candidate : candidates) {
            if (!candidate.startsWith(workspaceRoot)) {
                continue;
            }
            if (!Files.exists(candidate) || !Files.isRegularFile(candidate)) {
                continue;
            }
            return objectMapper.readValue(candidate.toFile(), IsuDegreeDataset.class);
        }

        throw new IllegalArgumentException("No readable ISU dataset file found. Expected docs/isu-degree-dataset.json.");
    }
}

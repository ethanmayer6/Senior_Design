package com.sdmay19.courseflow.importer.isu;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class IsuImportJobService {
    private final IsuDegreeImportService importService;
    private final Map<String, JobState> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public IsuImportJobService(IsuDegreeImportService importService) {
        this.importService = importService;
    }

    public IsuImportJobResponse startJob(IsuDegreeDataset dataset, IsuImportMode mode, Integer chunkSize) {
        if (dataset == null) {
            throw new IllegalArgumentException("Dataset cannot be null.");
        }

        int safeChunkSize = Math.max(1, Math.min(chunkSize == null ? 100 : chunkSize, 1000));
        JobState job = new JobState();
        job.jobId = UUID.randomUUID().toString();
        job.mode = mode == null ? IsuImportMode.ALL : mode;
        job.dataset = dataset;
        job.chunkSize = safeChunkSize;
        job.status = IsuImportJobStatus.RUNNING;
        job.startedAt = LocalDateTime.now();
        job.result = new IsuDegreeImportResult();
        job.chunks = buildChunks(dataset, job.mode, safeChunkSize);
        job.totalChunks = job.chunks.size();
        jobs.put(job.jobId, job);

        executor.submit(() -> processJob(job));
        return toResponse(job);
    }

    public IsuImportJobResponse getJob(String jobId) {
        JobState job = jobs.get(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Import job not found: " + jobId);
        }
        return toResponse(job);
    }

    public IsuImportJobResponse retryFailedChunks(String jobId) {
        JobState job = jobs.get(jobId);
        if (job == null) {
            throw new IllegalArgumentException("Import job not found: " + jobId);
        }
        synchronized (job) {
            if (job.status == IsuImportJobStatus.RUNNING) {
                throw new IllegalStateException("Job is still running.");
            }
            if (job.failedChunks.isEmpty()) {
                return toResponse(job);
            }
            job.status = IsuImportJobStatus.RUNNING;
            job.finishedAt = null;
        }

        executor.submit(() -> retryJob(job));
        return toResponse(job);
    }

    private void processJob(JobState job) {
        try {
            for (ChunkRef chunk : job.chunks) {
                runChunk(job, chunk);
            }
            finalizeJob(job);
        } catch (Exception ex) {
            synchronized (job) {
                job.status = IsuImportJobStatus.FAILED;
                job.finishedAt = LocalDateTime.now();
                job.message = ex.getMessage();
            }
        }
    }

    private void retryJob(JobState job) {
        List<Integer> retryIndexes;
        synchronized (job) {
            retryIndexes = new ArrayList<>(job.failedChunks.keySet());
        }
        for (Integer index : retryIndexes) {
            ChunkRef chunk = job.chunks.get(index);
            runChunk(job, chunk);
        }
        finalizeJob(job);
    }

    private void runChunk(JobState job, ChunkRef chunk) {
        try {
            IsuDegreeImportResult chunkResult = switch (chunk.type) {
                case COURSES -> importService.importCoursesChunk(chunk.courseChunk);
                case MAJORS -> importService.importMajorsChunk(chunk.majorChunk);
            };
            mergeResults(job.result, chunkResult);
            synchronized (job) {
                job.failedChunks.remove(chunk.index);
                job.processedChunkIndexes.put(chunk.index, true);
                job.processedChunks = job.processedChunkIndexes.size();
                job.message = "Processed chunk " + (chunk.index + 1) + "/" + Math.max(1, job.totalChunks);
            }
        } catch (Exception ex) {
            synchronized (job) {
                job.failedChunks.put(chunk.index, ex.getMessage());
                job.processedChunkIndexes.put(chunk.index, true);
                job.processedChunks = job.processedChunkIndexes.size();
                job.message = "Chunk " + (chunk.index + 1) + " failed: " + ex.getMessage();
            }
        }
    }

    private void finalizeJob(JobState job) {
        synchronized (job) {
            job.finishedAt = LocalDateTime.now();
            if (job.failedChunks.isEmpty()) {
                job.status = IsuImportJobStatus.COMPLETED;
                job.message = "Import completed.";
            } else {
                job.status = IsuImportJobStatus.COMPLETED_WITH_ERRORS;
                job.message = "Import completed with failed chunks. Retry failed chunks to continue.";
            }
        }
    }

    private List<ChunkRef> buildChunks(IsuDegreeDataset dataset, IsuImportMode mode, int chunkSize) {
        List<ChunkRef> chunks = new ArrayList<>();
        int index = 0;

        if (mode == IsuImportMode.ALL || mode == IsuImportMode.COURSES_ONLY) {
            List<IsuDegreeDataset.CourseImport> courses = dataset.courses() == null ? List.of() : dataset.courses();
            for (int i = 0; i < courses.size(); i += chunkSize) {
                ChunkRef ref = new ChunkRef();
                ref.index = index++;
                ref.type = ChunkType.COURSES;
                ref.courseChunk = new ArrayList<>(courses.subList(i, Math.min(courses.size(), i + chunkSize)));
                ref.majorChunk = List.of();
                chunks.add(ref);
            }
        }

        if (mode == IsuImportMode.ALL || mode == IsuImportMode.MAJORS_ONLY) {
            List<IsuDegreeDataset.MajorImport> majors = dataset.majors() == null ? List.of() : dataset.majors();
            for (int i = 0; i < majors.size(); i += chunkSize) {
                ChunkRef ref = new ChunkRef();
                ref.index = index++;
                ref.type = ChunkType.MAJORS;
                ref.majorChunk = new ArrayList<>(majors.subList(i, Math.min(majors.size(), i + chunkSize)));
                ref.courseChunk = List.of();
                chunks.add(ref);
            }
        }

        return chunks;
    }

    private void mergeResults(IsuDegreeImportResult target, IsuDegreeImportResult source) {
        if (source == null) return;
        for (int i = 0; i < source.getCoursesCreated(); i++) target.incrementCoursesCreated();
        for (int i = 0; i < source.getCoursesUpdated(); i++) target.incrementCoursesUpdated();
        for (int i = 0; i < source.getMajorsCreated(); i++) target.incrementMajorsCreated();
        for (int i = 0; i < source.getMajorsUpdated(); i++) target.incrementMajorsUpdated();
        for (int i = 0; i < source.getRequirementsCreated(); i++) target.incrementRequirementsCreated();
        for (int i = 0; i < source.getRequirementGroupsCreated(); i++) target.incrementRequirementGroupsCreated();
        for (String warning : source.getWarnings()) target.addWarning(warning);
    }

    private IsuImportJobResponse toResponse(JobState job) {
        IsuImportJobResponse response = new IsuImportJobResponse();
        synchronized (job) {
            response.setJobId(job.jobId);
            response.setMode(job.mode);
            response.setStatus(job.status);
            response.setTotalChunks(job.totalChunks);
            response.setProcessedChunks(job.processedChunks);
            int percent = job.totalChunks == 0 ? 100 : (int) Math.round((job.processedChunks * 100.0) / job.totalChunks);
            response.setProgressPercent(Math.max(0, Math.min(100, percent)));
            response.setFailedChunks(Collections.unmodifiableMap(new LinkedHashMap<>(job.failedChunks)));
            response.setResult(job.result);
            response.setMessage(job.message);
            response.setStartedAt(job.startedAt);
            response.setFinishedAt(job.finishedAt);
        }
        return response;
    }

    private enum ChunkType {
        COURSES,
        MAJORS
    }

    private static class ChunkRef {
        int index;
        ChunkType type;
        List<IsuDegreeDataset.CourseImport> courseChunk = List.of();
        List<IsuDegreeDataset.MajorImport> majorChunk = List.of();
    }

    private static class JobState {
        String jobId;
        IsuImportMode mode;
        int chunkSize;
        IsuDegreeDataset dataset;
        IsuImportJobStatus status;
        IsuDegreeImportResult result;
        List<ChunkRef> chunks = List.of();
        int totalChunks;
        int processedChunks;
        Map<Integer, Boolean> processedChunkIndexes = new LinkedHashMap<>();
        Map<Integer, String> failedChunks = new LinkedHashMap<>();
        String message;
        LocalDateTime startedAt;
        LocalDateTime finishedAt;
    }
}


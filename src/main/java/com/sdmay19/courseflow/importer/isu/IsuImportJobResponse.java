package com.sdmay19.courseflow.importer.isu;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;

public class IsuImportJobResponse {
    private String jobId;
    private IsuImportJobStatus status;
    private IsuImportMode mode;
    private int progressPercent;
    private int totalChunks;
    private int processedChunks;
    private Map<Integer, String> failedChunks;
    private IsuDegreeImportResult result;
    private String message;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public IsuImportJobStatus getStatus() {
        return status;
    }

    public void setStatus(IsuImportJobStatus status) {
        this.status = status;
    }

    public IsuImportMode getMode() {
        return mode;
    }

    public void setMode(IsuImportMode mode) {
        this.mode = mode;
    }

    public int getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(int progressPercent) {
        this.progressPercent = progressPercent;
    }

    public int getTotalChunks() {
        return totalChunks;
    }

    public void setTotalChunks(int totalChunks) {
        this.totalChunks = totalChunks;
    }

    public int getProcessedChunks() {
        return processedChunks;
    }

    public void setProcessedChunks(int processedChunks) {
        this.processedChunks = processedChunks;
    }

    public Map<Integer, String> getFailedChunks() {
        return failedChunks == null ? Collections.emptyMap() : failedChunks;
    }

    public void setFailedChunks(Map<Integer, String> failedChunks) {
        this.failedChunks = failedChunks;
    }

    public IsuDegreeImportResult getResult() {
        return result;
    }

    public void setResult(IsuDegreeImportResult result) {
        this.result = result;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }
}


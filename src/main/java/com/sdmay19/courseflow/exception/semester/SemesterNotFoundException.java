package com.sdmay19.courseflow.exception.semester;

public class SemesterNotFoundException extends RuntimeException {
    public SemesterNotFoundException(String message) {
        super(message);
    }
}

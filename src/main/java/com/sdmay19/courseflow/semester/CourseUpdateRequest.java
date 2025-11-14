package com.sdmay19.courseflow.semester;

public class CourseUpdateRequest {
    private String operation;
    private String courseIdent;

    public CourseUpdateRequest() {
    }

    public CourseUpdateRequest(String operation, String courseIdent) {
        this.operation = operation;
        this.courseIdent = courseIdent;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getCourseIdent() {
        return courseIdent;
    }

    public void setCourseIdent(String courseIdent) {
        this.courseIdent = courseIdent;
    }
}

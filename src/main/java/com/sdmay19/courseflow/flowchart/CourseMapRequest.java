package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.flowchart.Status;

public class CourseMapRequest {
    private Status status;
    private String courseIdent;
    private String operation;

    public CourseMapRequest() {
    }

    public CourseMapRequest(Status status, String courseIdent, String operation) {
        this.status = status;
        this.courseIdent = courseIdent;
        this.operation = operation;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getCourseIdent() {
        return courseIdent;
    }

    public void setCourseIdent(String courseIdent) {
        this.courseIdent = courseIdent;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }
}

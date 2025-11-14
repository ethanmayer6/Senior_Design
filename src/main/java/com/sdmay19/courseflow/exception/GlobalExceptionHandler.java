package com.sdmay19.courseflow.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import com.sdmay19.courseflow.exception.course.CourseCreationException;
import com.sdmay19.courseflow.exception.course.CourseNotFoundException;
import com.sdmay19.courseflow.exception.degreerequirement.DegreeRequirementNotFoundException;
import com.sdmay19.courseflow.exception.flowchart.FlowchartNotFoundException;
import com.sdmay19.courseflow.exception.major.MajorCreationException;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupCreationException;
import com.sdmay19.courseflow.exception.requirementgroup.RequirementGroupNotFoundException;
import com.sdmay19.courseflow.exception.degreerequirement.DegreeRequirementCreationException;
import com.sdmay19.courseflow.exception.semester.SemesterNotFoundException;
import com.sdmay19.courseflow.exception.user.AuthenticationFailedException;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // USER
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Object> handleUserNotFoundException(UserNotFoundException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }
    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<Object> handleAuthenticationException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }

    // COURSE
    @ExceptionHandler(CourseNotFoundException.class)
    public ResponseEntity<Object> handleCourseNotFoundException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }
    @ExceptionHandler(CourseCreationException.class)
    public ResponseEntity<Object> handleCourseCreationException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // REQUIREMENT
    @ExceptionHandler(RequirementGroupCreationException.class)
    public ResponseEntity<Object> handleRequirementGroupCreationException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(RequirementGroupNotFoundException.class)
    public ResponseEntity<Object> handleRequirementGroupNotFoundException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    // DEGREE
    @ExceptionHandler(DegreeRequirementCreationException.class)
    public ResponseEntity<Object> handleDegreeRequirementCreationException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(DegreeRequirementNotFoundException.class)
    public ResponseEntity<Object> handleDegreeRequirementNotFoundException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    // MAJOR
    @ExceptionHandler(MajorCreationException.class)
    public ResponseEntity<Object> handleMajorCreationException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // SEMESTER
    @ExceptionHandler(SemesterNotFoundException.class)
    public ResponseEntity<Object> handleSemesterNotFoundException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    // FLOWCHART
    @ExceptionHandler(FlowchartNotFoundException.class)
    public ResponseEntity<Object> handleFlowchartNotFoundException(AuthenticationFailedException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", e.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }
}

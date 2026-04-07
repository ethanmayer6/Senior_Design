package com.sdmay19.courseflow.schedule;

public record CustomScheduleEventRequest(
        String title,
        String eventDate,
        String startTime,
        String endTime,
        String location,
        String notes) {
}

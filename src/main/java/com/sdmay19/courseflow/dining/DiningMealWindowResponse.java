package com.sdmay19.courseflow.dining;

public record DiningMealWindowResponse(
        String name,
        String startTime,
        String endTime,
        boolean current) {
}

package com.sdmay19.courseflow.dining;

import java.util.List;

public record DiningMenuItemResponse(
        String name,
        List<String> dietaryTags) {
}

package com.sdmay19.courseflow.dining;

import java.util.List;

public record DiningStationResponse(
        String name,
        List<DiningMenuCategoryResponse> categories) {
}

package com.sdmay19.courseflow.dining;

import java.util.List;

public record DiningMenuCategoryResponse(
        String name,
        List<DiningMenuItemResponse> items) {
}

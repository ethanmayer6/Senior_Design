package com.sdmay19.courseflow.dining;

import java.util.List;

public record DiningHallResponse(
        String slug,
        String title,
        String facility,
        String address,
        String sourceUrl,
        boolean openNow,
        List<DiningMealWindowResponse> todaysHours,
        List<DiningMenuSectionResponse> menus,
        String warningMessage) {
}

package com.sdmay19.courseflow.dining;

import java.util.List;

public record DiningMenuSectionResponse(
        String section,
        List<DiningStationResponse> stations) {
}

package com.sdmay19.courseflow.dining;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDate;

public interface DiningMenuClient {

    JsonNode fetchAllLocations(LocalDate serviceDate);

    JsonNode fetchLocationDetail(String slug, LocalDate serviceDate);
}

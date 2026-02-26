package com.sdmay19.courseflow.professor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

final class ProfessorImportParsers {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ProfessorImportParsers() {
    }

    static ProfessorImportDataset parseDataset(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            throw new IllegalArgumentException("Import payload is empty.");
        }
        try {
            JsonNode root = MAPPER.readTree(rawJson);
            if (root.isArray()) {
                List<ProfessorImportRecord> records = new ArrayList<>();
                for (JsonNode item : root) {
                    records.add(MAPPER.treeToValue(item, ProfessorImportRecord.class));
                }
                return new ProfessorImportDataset("MANUAL_JSON", null, records);
            }
            return MAPPER.treeToValue(root, ProfessorImportDataset.class);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON import payload: " + e.getOriginalMessage());
        }
    }
}

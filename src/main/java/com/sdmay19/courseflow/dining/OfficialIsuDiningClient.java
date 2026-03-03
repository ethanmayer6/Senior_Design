package com.sdmay19.courseflow.dining;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Component
public class OfficialIsuDiningClient implements DiningMenuClient {

    private static final ZoneId DINING_ZONE = ZoneId.of("America/Chicago");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiBaseUrl;

    @Autowired
    public OfficialIsuDiningClient(
            ObjectMapper objectMapper,
            @Value("${isu.dining.api-base-url:https://www.dining.iastate.edu/wp-json/dining/menu-hours}") String apiBaseUrl) {
        this(objectMapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), apiBaseUrl);
    }

    OfficialIsuDiningClient(ObjectMapper objectMapper, HttpClient httpClient, String apiBaseUrl) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        this.apiBaseUrl = apiBaseUrl;
    }

    @Override
    public JsonNode fetchAllLocations(LocalDate serviceDate) {
        URI uri = UriComponentsBuilder.fromHttpUrl(apiBaseUrl)
                .pathSegment("get-all-locations")
                .queryParam("timestamp", formatSummaryDate(serviceDate))
                .build(true)
                .toUri();
        return send(uri);
    }

    @Override
    public JsonNode fetchLocationDetail(String slug, LocalDate serviceDate) {
        URI uri = UriComponentsBuilder.fromHttpUrl(apiBaseUrl)
                .pathSegment("get-single-location")
                .queryParam("slug", URLEncoder.encode(slug, StandardCharsets.UTF_8))
                .queryParam("time", toNoonEpochSeconds(serviceDate))
                .build(true)
                .toUri();
        JsonNode response = send(uri);
        if (!response.isArray() || response.isEmpty()) {
            throw new IllegalStateException("Dining detail response was empty for slug: " + slug);
        }
        return response.get(0);
    }

    private JsonNode send(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .header("Accept", "application/json")
                .header("User-Agent", "CourseFlow Dining Module")
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Dining upstream request failed with status " + response.statusCode() + " for " + uri);
            }
            return objectMapper.readTree(response.body());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to parse dining upstream response for " + uri, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Dining upstream request was interrupted for " + uri, e);
        }
    }

    private static String formatSummaryDate(LocalDate serviceDate) {
        return serviceDate.getYear() + "-" + serviceDate.getMonthValue() + "-" + serviceDate.getDayOfMonth();
    }

    private static long toNoonEpochSeconds(LocalDate serviceDate) {
        return ZonedDateTime.of(serviceDate, LocalTime.NOON, DINING_ZONE).toEpochSecond();
    }
}

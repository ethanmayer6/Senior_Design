package com.sdmay19.courseflow.dining;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
public class DiningService {

    private static final ZoneId DINING_ZONE = ZoneId.of("America/Chicago");
    private static final String SOURCE_NAME = "Iowa State Dining";
    private static final String SOURCE_URL = "https://www.dining.iastate.edu/hours-menus/";
    private static final List<MainDiningHall> MAIN_DINING_HALLS = List.of(
            new MainDiningHall("friley-windows-2-2", "Friley Windows", "Friley Hall"),
            new MainDiningHall("conversations-2", "Conversations", "Oak-Elm Residence Hall"),
            new MainDiningHall("seasons-marketplace-2-2", "Seasons Marketplace", "Maple-Willow-Larch Commons"),
            new MainDiningHall("southside-eats", "South Side Eats", "Wallace-Wilson Commons"),
            new MainDiningHall("union-drive-marketplace-2-2", "Union Drive Marketplace", "Union Drive Community Center"));

    private final DiningMenuClient diningMenuClient;
    private final Clock clock;

    @Autowired
    public DiningService(DiningMenuClient diningMenuClient) {
        this(diningMenuClient, Clock.system(DINING_ZONE));
    }

    DiningService(DiningMenuClient diningMenuClient, Clock clock) {
        this.diningMenuClient = diningMenuClient;
        this.clock = clock;
    }

    public DiningOverviewResponse getTodayOverview() {
        return getDiningOverviewForDate(LocalDate.now(clock));
    }

    @Cacheable(value = "dailyDiningOverview", key = "#serviceDate.toString()", unless = "#result.hasWarnings()")
    public DiningOverviewResponse getDiningOverviewForDate(LocalDate serviceDate) {
        Map<String, JsonNode> summariesBySlug = new LinkedHashMap<>();
        try {
            JsonNode allLocations = diningMenuClient.fetchAllLocations(serviceDate);
            if (allLocations != null && allLocations.isArray()) {
                for (JsonNode location : allLocations) {
                    String slug = text(location, "slug");
                    if (!slug.isBlank()) {
                        summariesBySlug.put(slug, location);
                    }
                }
            }
        } catch (RuntimeException ignored) {
        }

        List<DiningHallResponse> halls = MAIN_DINING_HALLS.stream()
                .map(hall -> buildHallResponse(hall, summariesBySlug.get(hall.slug()), serviceDate))
                .toList();

        return new DiningOverviewResponse(
                serviceDate,
                clock.instant(),
                SOURCE_NAME,
                SOURCE_URL,
                halls);
    }

    private DiningHallResponse buildHallResponse(MainDiningHall hall, JsonNode summaryNode, LocalDate serviceDate) {
        JsonNode detailNode = null;
        String warningMessage = null;

        try {
            detailNode = diningMenuClient.fetchLocationDetail(hall.slug(), serviceDate);
        } catch (RuntimeException ex) {
            warningMessage = "Live menu details are temporarily unavailable from Iowa State Dining.";
        }

        if (summaryNode == null && detailNode == null) {
            return new DiningHallResponse(
                    hall.slug(),
                    hall.fallbackTitle(),
                    hall.fallbackFacility(),
                    "",
                    SOURCE_URL,
                    false,
                    List.of(),
                    List.of(),
                    "This hall was not present in the official Iowa State Dining feed.");
        }

        JsonNode preferredNode = detailNode != null ? detailNode : summaryNode;
        List<DiningMenuSectionResponse> menus = detailNode != null
                ? mapMenus(detailNode.path("menus"))
                : List.of();
        List<DiningMealWindowResponse> todaysHours = detailNode != null
                ? mapTodaysHours(detailNode.path("todaysHours"), menus)
                : mapSummaryHours(summaryNode.path("weeklyHours"), serviceDate);
        if (todaysHours.isEmpty() && summaryNode != null) {
            todaysHours = mapSummaryHours(summaryNode.path("weeklyHours"), serviceDate);
        }

        return new DiningHallResponse(
                hall.slug(),
                firstNonBlank(text(preferredNode, "title"), hall.fallbackTitle()),
                firstNonBlank(text(preferredNode, "facility"), hall.fallbackFacility()),
                text(preferredNode, "address"),
                firstNonBlank(text(summaryNode, "permalink"), SOURCE_URL),
                isOpenNow(todaysHours, serviceDate),
                todaysHours,
                menus,
                warningMessage);
    }

    private List<DiningMealWindowResponse> mapTodaysHours(JsonNode todaysHoursNode, List<DiningMenuSectionResponse> menus) {
        List<DiningMealWindowResponse> windows = new ArrayList<>();
        List<String> fallbackSections = menus.stream()
                .map(DiningMenuSectionResponse::section)
                .toList();

        if (todaysHoursNode != null && todaysHoursNode.isArray()) {
            for (JsonNode item : todaysHoursNode) {
                String startTime = text(item, "start_time");
                String endTime = text(item, "end_time");
                if (startTime.isBlank() || endTime.isBlank()) {
                    continue;
                }
                String normalizedName = normalizeServiceName(text(item, "name"), startTime, fallbackSections);
                windows.add(new DiningMealWindowResponse(
                        normalizedName,
                        startTime,
                        endTime,
                        isCurrentWindow(startTime, endTime)));
            }
        }

        windows.sort(Comparator.comparing(DiningMealWindowResponse::startTime));
        return windows;
    }

    private List<DiningMealWindowResponse> mapSummaryHours(JsonNode weeklyHoursNode, LocalDate serviceDate) {
        if (weeklyHoursNode == null || !weeklyHoursNode.isArray()) {
            return List.of();
        }

        for (JsonNode item : weeklyHoursNode) {
            if (!serviceDate.toString().equals(text(item, "date"))) {
                continue;
            }
            JsonNode hours = item.path("hours");
            if (hours == null || hours.isMissingNode() || !hours.isObject()) {
                return List.of();
            }

            List<DiningMealWindowResponse> windows = new ArrayList<>();
            List<String> names = new ArrayList<>();
            hours.fieldNames().forEachRemaining(names::add);
            for (String rawName : names) {
                JsonNode hourBlock = hours.path(rawName);
                String startTime = text(hourBlock, "start_time");
                String endTime = text(hourBlock, "end_time");
                if (startTime.isBlank() || endTime.isBlank()) {
                    continue;
                }
                String normalizedName = normalizeServiceName(rawName, startTime, List.of());
                windows.add(new DiningMealWindowResponse(
                        normalizedName,
                        startTime,
                        endTime,
                        isCurrentWindow(startTime, endTime)));
            }
            windows.sort(Comparator.comparing(DiningMealWindowResponse::startTime));
            return windows;
        }

        return List.of();
    }

    private List<DiningMenuSectionResponse> mapMenus(JsonNode menusNode) {
        if (menusNode == null || !menusNode.isArray()) {
            return List.of();
        }

        List<DiningMenuSectionResponse> sections = new ArrayList<>();
        for (JsonNode menu : menusNode) {
            List<DiningStationResponse> stations = new ArrayList<>();
            JsonNode menuDisplays = menu.path("menuDisplays");
            if (menuDisplays.isArray()) {
                for (JsonNode station : menuDisplays) {
                    List<DiningMenuCategoryResponse> categories = new ArrayList<>();
                    JsonNode categoryNodes = station.path("categories");
                    if (categoryNodes.isArray()) {
                        for (JsonNode category : categoryNodes) {
                            List<DiningMenuItemResponse> items = new ArrayList<>();
                            JsonNode menuItems = category.path("menuItems");
                            if (menuItems.isArray()) {
                                for (JsonNode menuItem : menuItems) {
                                    String itemName = text(menuItem, "name");
                                    if (itemName.isBlank()) {
                                        continue;
                                    }
                                    items.add(new DiningMenuItemResponse(itemName, dietaryTags(menuItem)));
                                }
                            }
                            if (!items.isEmpty()) {
                                categories.add(new DiningMenuCategoryResponse(
                                        firstNonBlank(text(category, "category"), "Menu Items"),
                                        items));
                            }
                        }
                    }
                    if (!categories.isEmpty()) {
                        stations.add(new DiningStationResponse(
                                firstNonBlank(text(station, "name"), "Station"),
                                categories));
                    }
                }
            }

            if (!stations.isEmpty()) {
                sections.add(new DiningMenuSectionResponse(
                        normalizeServiceName(text(menu, "section"), null, List.of()),
                        stations));
            }
        }

        return sections;
    }

    private List<String> dietaryTags(JsonNode menuItem) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        if ("1".equals(text(menuItem, "isVegetarian"))) {
            tags.add("Vegetarian");
        }
        if ("1".equals(text(menuItem, "isVegan"))) {
            tags.add("Vegan");
        }
        if ("1".equals(text(menuItem, "isHalal"))) {
            tags.add("Halal");
        }
        return List.copyOf(tags);
    }

    private boolean isOpenNow(List<DiningMealWindowResponse> windows, LocalDate serviceDate) {
        if (!LocalDate.now(clock).equals(serviceDate)) {
            return false;
        }
        return windows.stream().anyMatch(DiningMealWindowResponse::current);
    }

    private boolean isCurrentWindow(String startTime, String endTime) {
        if (startTime == null || endTime == null || startTime.isBlank() || endTime.isBlank()) {
            return false;
        }

        LocalTime now = LocalTime.now(clock);
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);
        return !now.isBefore(start) && now.isBefore(end);
    }

    private String normalizeServiceName(String rawName, String startTime, List<String> fallbackSections) {
        String trimmed = rawName == null ? "" : rawName.trim();
        if (trimmed.equalsIgnoreCase("Breakfast Hours")) {
            return "Breakfast";
        }
        if (trimmed.equalsIgnoreCase("After Hours")) {
            return "Late Night";
        }
        if (!trimmed.isBlank() && !trimmed.equalsIgnoreCase("Untitled")) {
            return trimmed;
        }

        if (!fallbackSections.isEmpty()) {
            for (String section : fallbackSections) {
                if (!section.equalsIgnoreCase("Bakery Menu")) {
                    return section;
                }
            }
            return fallbackSections.get(0);
        }

        if (startTime == null || startTime.isBlank()) {
            return "Service";
        }

        LocalTime start = LocalTime.parse(startTime);
        if (start.isBefore(LocalTime.of(11, 0))) {
            return "Breakfast";
        }
        if (start.isBefore(LocalTime.of(15, 0))) {
            return "Lunch";
        }
        if (start.isBefore(LocalTime.of(20, 0))) {
            return "Dinner";
        }
        return "Late Night";
    }

    private static String text(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.get(fieldName) == null || node.get(fieldName).isNull()) {
            return "";
        }
        return node.get(fieldName).asText("").trim();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private record MainDiningHall(String slug, String fallbackTitle, String fallbackFacility) {
    }
}

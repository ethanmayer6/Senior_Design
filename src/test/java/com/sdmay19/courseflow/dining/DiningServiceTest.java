package com.sdmay19.courseflow.dining;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DiningServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private FakeDiningMenuClient diningMenuClient;
    private DiningService diningService;

    @BeforeEach
    void setUp() {
        diningMenuClient = new FakeDiningMenuClient();
        Clock fixedClock = Clock.fixed(Instant.parse("2026-03-03T17:20:00Z"), ZoneId.of("America/Chicago"));
        diningService = new DiningService(diningMenuClient, fixedClock);
    }

    @Test
    void getDiningOverviewForDate_returnsMainResidenceHallsInExpectedOrder() throws Exception {
        LocalDate serviceDate = LocalDate.of(2026, 3, 3);
        diningMenuClient.allLocations = objectMapper.readTree("""
                [
                  {
                    "slug": "friley-windows-2-2",
                    "title": "Friley Windows",
                    "facility": "",
                    "address": "212 Beyer Ct, Ames, IA 50012",
                    "permalink": "https://www.dining.iastate.edu/location/friley-windows-2-2/"
                  },
                  {
                    "slug": "conversations-2",
                    "title": "Conversations",
                    "facility": "Oak-Elm Residence Hall",
                    "address": "455 Richardson Ct, Ames, IA 50013",
                    "permalink": "https://www.dining.iastate.edu/location/conversations-2/"
                  },
                  {
                    "slug": "seasons-marketplace-2-2",
                    "title": "Seasons Marketplace",
                    "facility": "Maple-Willow-Larch Commons",
                    "address": "224 Beach Rd, Ames, IA 50013",
                    "permalink": "https://www.dining.iastate.edu/location/seasons-marketplace-2-2/"
                  },
                  {
                    "slug": "southside-eats",
                    "title": "South Side Eats",
                    "facility": "Wallace-Wilson Commons",
                    "address": "917 Welch Ave., Ames Iowa 50014",
                    "permalink": "https://www.dining.iastate.edu/location/southside-eats/"
                  },
                  {
                    "slug": "union-drive-marketplace-2-2",
                    "title": "Union Drive Marketplace",
                    "facility": "Union Drive Community Center",
                    "address": "207 Beyer Ct, Ames, IA 50012",
                    "permalink": "https://www.dining.iastate.edu/location/union-drive-marketplace-2-2/"
                  }
                ]
                """);

        diningMenuClient.details.put("friley-windows-2-2", locationDetail("""
                {
                  "slug": "friley-windows-2-2",
                  "title": "Friley Windows",
                  "facility": "",
                  "address": "212 Beyer Ct, Ames, IA 50012",
                  "todaysHours": [
                    {"name": "Breakfast Hours", "start_time": "06:30:00", "end_time": "10:00:00"},
                    {"name": "Lunch", "start_time": "10:30:00", "end_time": "15:00:00"}
                  ],
                  "menus": [
                    {
                      "section": "Lunch",
                      "menuDisplays": [
                        {
                          "name": "Simmer",
                          "categories": [
                            {
                              "category": "Soups",
                              "menuItems": [
                                {"name": "Chicken Tortilla Soup", "isVegetarian": "0", "isVegan": "0", "isHalal": "0"},
                                {"name": "Vegetable Chili", "isVegetarian": "1", "isVegan": "1", "isHalal": "1"}
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """));
        diningMenuClient.details.put("conversations-2", locationDetail("""
                {
                  "slug": "conversations-2",
                  "title": "Conversations",
                  "facility": "Oak-Elm Residence Hall",
                  "address": "455 Richardson Ct, Ames, IA 50013",
                  "todaysHours": [
                    {"name": "After Hours", "start_time": "20:00:00", "end_time": "22:00:00"}
                  ],
                  "menus": [
                    {
                      "section": "After Hours",
                      "menuDisplays": [
                        {
                          "name": "Deli",
                          "categories": [
                            {
                              "category": "Sandwiches",
                              "menuItems": [
                                {"name": "Turkey Club", "isVegetarian": "0", "isVegan": "0", "isHalal": "0"}
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """));
        diningMenuClient.details.put("seasons-marketplace-2-2", locationDetail("""
                {
                  "slug": "seasons-marketplace-2-2",
                  "title": "Seasons Marketplace",
                  "facility": "Maple-Willow-Larch Commons",
                  "address": "224 Beach Rd, Ames, IA 50013",
                  "todaysHours": [
                    {"name": "Breakfast", "start_time": "06:30:00", "end_time": "09:30:00"},
                    {"name": "Lunch", "start_time": "11:00:00", "end_time": "14:00:00"}
                  ],
                  "menus": [
                    {
                      "section": "Breakfast",
                      "menuDisplays": [
                        {
                          "name": "Stack",
                          "categories": [
                            {
                              "category": "Entrees",
                              "menuItems": [
                                {"name": "French Toast", "isVegetarian": "1", "isVegan": "0", "isHalal": "0"}
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """));
        diningMenuClient.details.put("southside-eats", locationDetail("""
                {
                  "slug": "southside-eats",
                  "title": "South Side Eats",
                  "facility": "Wallace-Wilson Commons",
                  "address": "917 Welch Ave., Ames Iowa 50014",
                  "todaysHours": [
                    {"name": "", "start_time": "17:00:00", "end_time": "19:00:00"}
                  ],
                  "menus": [
                    {
                      "section": "Dinner",
                      "menuDisplays": [
                        {
                          "name": "Southside Eats",
                          "categories": [
                            {
                              "category": "Entrees",
                              "menuItems": [
                                {"name": "Pasta Bake", "isVegetarian": "1", "isVegan": "0", "isHalal": "0"}
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "section": "Bakery Menu",
                      "menuDisplays": []
                    }
                  ]
                }
                """));
        diningMenuClient.details.put("union-drive-marketplace-2-2", locationDetail("""
                {
                  "slug": "union-drive-marketplace-2-2",
                  "title": "Union Drive Marketplace",
                  "facility": "Union Drive Community Center",
                  "address": "207 Beyer Ct, Ames, IA 50012",
                  "todaysHours": [
                    {"name": "Untitled", "start_time": "16:30:00", "end_time": "19:30:00"}
                  ],
                  "menus": [
                    {
                      "section": "Dinner",
                      "menuDisplays": [
                        {
                          "name": "Sear",
                          "categories": [
                            {
                              "category": "Entrees",
                              "menuItems": [
                                {"name": "Grilled Chicken", "isVegetarian": "0", "isVegan": "0", "isHalal": "1"}
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """));

        DiningOverviewResponse response = diningService.getDiningOverviewForDate(serviceDate);

        assertThat(response.halls()).extracting(DiningHallResponse::slug).containsExactly(
                "friley-windows-2-2",
                "conversations-2",
                "seasons-marketplace-2-2",
                "southside-eats",
                "union-drive-marketplace-2-2");
        assertThat(response.halls().get(0).facility()).isEqualTo("Friley Hall");
        assertThat(response.halls().get(0).menus().get(0).stations().get(0).categories().get(0).items())
                .extracting(DiningMenuItemResponse::dietaryTags)
                .containsExactly(
                        java.util.List.of(),
                        java.util.List.of("Vegetarian", "Vegan", "Halal"));
        assertThat(response.halls().get(1).todaysHours().get(0).name()).isEqualTo("Late Night");
        assertThat(response.halls().get(3).todaysHours().get(0).name()).isEqualTo("Dinner");
        assertThat(response.halls().get(4).todaysHours().get(0).name()).isEqualTo("Dinner");
        assertThat(response.hasWarnings()).isFalse();
    }

    @Test
    void getDiningOverviewForDate_fallsBackToSummaryHoursWhenDetailFails() throws Exception {
        LocalDate serviceDate = LocalDate.of(2026, 3, 3);
        diningMenuClient.allLocations = objectMapper.readTree("""
                [
                  {
                    "slug": "friley-windows-2-2",
                    "title": "Friley Windows",
                    "facility": "",
                    "address": "212 Beyer Ct, Ames, IA 50012",
                    "permalink": "https://www.dining.iastate.edu/location/friley-windows-2-2/",
                    "weeklyHours": [
                      {
                        "date": "2026-03-03",
                        "hours": {
                          "Lunch": {"start_time": "10:30:00", "end_time": "15:00:00"},
                          "Dinner": {"start_time": "15:00:00", "end_time": "19:00:00"}
                        }
                      }
                    ]
                  }
                ]
                """);
        diningMenuClient.failures.put("friley-windows-2-2", new IllegalStateException("upstream unavailable"));

        DiningOverviewResponse response = diningService.getDiningOverviewForDate(serviceDate);

        DiningHallResponse friley = response.halls().get(0);
        assertThat(friley.warningMessage()).isEqualTo("Live menu details are temporarily unavailable from Iowa State Dining.");
        assertThat(friley.todaysHours()).extracting(DiningMealWindowResponse::name).containsExactly("Lunch", "Dinner");
        assertThat(friley.menus()).isEmpty();
        assertThat(response.hasWarnings()).isTrue();
    }

    private JsonNode locationDetail(String json) throws Exception {
        return objectMapper.readTree(json);
    }

    private static final class FakeDiningMenuClient implements DiningMenuClient {
        private JsonNode allLocations;
        private final Map<String, JsonNode> details = new HashMap<>();
        private final Map<String, RuntimeException> failures = new HashMap<>();

        @Override
        public JsonNode fetchAllLocations(LocalDate serviceDate) {
            return allLocations;
        }

        @Override
        public JsonNode fetchLocationDetail(String slug, LocalDate serviceDate) {
            RuntimeException failure = failures.get(slug);
            if (failure != null) {
                throw failure;
            }
            return details.get(slug);
        }
    }
}

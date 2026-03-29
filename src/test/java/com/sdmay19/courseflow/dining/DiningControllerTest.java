package com.sdmay19.courseflow.dining;

import com.sdmay19.courseflow.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = DiningController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                com.sdmay19.courseflow.security.SpringConfiguration.class,
                com.sdmay19.courseflow.security.JwtAuthenticationFilter.class
        })
)
@AutoConfigureMockMvc(addFilters = false)
@Import(TestSecurityConfig.class)
class DiningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DiningService diningService;

    @Test
    void getDiningOverview_withoutDateUsesTodayEndpoint() throws Exception {
        when(diningService.getTodayOverview()).thenReturn(sampleOverview(LocalDate.of(2026, 3, 26)));

        mockMvc.perform(get("/api/dining"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceDate").value("2026-03-26"))
                .andExpect(jsonPath("$.halls[0].title").value("Union Drive Marketplace"));

        verify(diningService).getTodayOverview();
    }

    @Test
    void getDiningOverview_withDateUsesRequestedDateEndpoint() throws Exception {
        LocalDate requestedDate = LocalDate.of(2026, 3, 27);
        when(diningService.getDiningOverviewForDate(requestedDate)).thenReturn(sampleOverview(requestedDate));

        mockMvc.perform(get("/api/dining").param("date", "2026-03-27"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceDate").value("2026-03-27"))
                .andExpect(jsonPath("$.halls[0].menus[0].stations[0].categories[0].items[0].name").value("Pasta Primavera"));

        verify(diningService).getDiningOverviewForDate(requestedDate);
    }

    private DiningOverviewResponse sampleOverview(LocalDate date) {
        DiningMenuItemResponse item = new DiningMenuItemResponse("Pasta Primavera", List.of("Vegetarian"));
        DiningMenuCategoryResponse category = new DiningMenuCategoryResponse("Entrees", List.of(item));
        DiningStationResponse station = new DiningStationResponse("Main Line", List.of(category));
        DiningMenuSectionResponse section = new DiningMenuSectionResponse("Lunch", List.of(station));
        DiningMealWindowResponse hours = new DiningMealWindowResponse("Lunch", "11:00", "14:00", true);
        DiningHallResponse hall = new DiningHallResponse(
                "union-drive",
                "Union Drive Marketplace",
                "UDM",
                "Iowa State",
                "https://example.edu/dining",
                true,
                List.of(hours),
                List.of(section),
                null
        );

        return new DiningOverviewResponse(
                date,
                Instant.parse("2026-03-26T12:00:00Z"),
                "Test Feed",
                "https://example.edu/dining",
                List.of(hall)
        );
    }
}

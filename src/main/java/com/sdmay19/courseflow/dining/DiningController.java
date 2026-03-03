package com.sdmay19.courseflow.dining;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dining")
public class DiningController {

    private final DiningService diningService;

    public DiningController(DiningService diningService) {
        this.diningService = diningService;
    }

    @GetMapping
    public DiningOverviewResponse getDiningOverview(
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            return diningService.getTodayOverview();
        }
        return diningService.getDiningOverviewForDate(date);
    }
}

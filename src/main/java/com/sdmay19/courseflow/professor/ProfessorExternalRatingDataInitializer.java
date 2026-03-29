package com.sdmay19.courseflow.professor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@Order(10)
@ConditionalOnProperty(
        value = "courseflow.professors.external-ratings.seed.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ProfessorExternalRatingDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProfessorExternalRatingDataInitializer.class);
    private static final String SEED_RESOURCE =
            "classpath:seed/professor-external-ratings-rmp-software-engineering.json";

    private final ProfessorRepository professorRepository;
    private final ProfessorService professorService;
    private final ResourceLoader resourceLoader;

    public ProfessorExternalRatingDataInitializer(
            ProfessorRepository professorRepository,
            ProfessorService professorService,
            ResourceLoader resourceLoader) {
        this.professorRepository = professorRepository;
        this.professorService = professorService;
        this.resourceLoader = resourceLoader;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (professorRepository.count() == 0) {
            return;
        }

        Resource resource = resourceLoader.getResource(SEED_RESOURCE);
        if (!resource.exists()) {
            log.warn("Professor external rating seed file not found at {}", SEED_RESOURCE);
            return;
        }

        try (var inputStream = resource.getInputStream()) {
            String rawJson = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            ProfessorExternalRatingImportDataset dataset =
                    ProfessorExternalRatingImportParsers.parseDataset(rawJson);
            ProfessorExternalRatingImportResponse response =
                    professorService.importExternalRatingsFromDataset(dataset, false);
            if (response.imported() > 0
                    || response.updated() > 0
                    || response.invalid() > 0
                    || response.unmatched() > 0) {
                log.info(
                        "Seeded professor external ratings: imported={}, updated={}, skipped={}, invalid={}, unmatched={}",
                        response.imported(),
                        response.updated(),
                        response.skipped(),
                        response.invalid(),
                        response.unmatched());
            }
        } catch (Exception ex) {
            log.error("Failed to seed professor external ratings from {}", SEED_RESOURCE, ex);
        }
    }
}

package com.sdmay19.courseflow.professor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@ConditionalOnProperty(
        value = "courseflow.professors.seed.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ProfessorDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProfessorDataInitializer.class);
    private static final String SEED_RESOURCE = "classpath:seed/isu-professors-dataset.json";

    private final ProfessorRepository professorRepository;
    private final ProfessorService professorService;
    private final ResourceLoader resourceLoader;
    private final ProfessorDirectoryState professorDirectoryState;

    public ProfessorDataInitializer(
            ProfessorRepository professorRepository,
            ProfessorService professorService,
            ResourceLoader resourceLoader,
            ProfessorDirectoryState professorDirectoryState) {
        this.professorRepository = professorRepository;
        this.professorService = professorService;
        this.resourceLoader = resourceLoader;
        this.professorDirectoryState = professorDirectoryState;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (professorRepository.count() > 0) {
            normalizeExistingDirectory();
            return;
        }

        Resource resource = resourceLoader.getResource(SEED_RESOURCE);
        if (!resource.exists()) {
            log.warn("Professor seed file not found at {}", SEED_RESOURCE);
            return;
        }

        professorDirectoryState.setSeeding(true);
        try (var inputStream = resource.getInputStream()) {
            String rawJson = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            ProfessorImportDataset dataset = ProfessorImportParsers.parseDataset(rawJson);
            ProfessorImportResponse response = professorService.importFromDataset(dataset, false);
            log.info(
                    "Seeded professor directory: imported={}, updated={}, skipped={}, invalid={}",
                    response.imported(),
                    response.updated(),
                    response.skipped(),
                    response.invalid());
            normalizeExistingDirectory();
        } catch (Exception ex) {
            log.error("Failed to seed professor directory from {}", SEED_RESOURCE, ex);
        } finally {
            professorDirectoryState.setSeeding(false);
        }
    }

    private void normalizeExistingDirectory() {
        try {
            int normalized = professorService.normalizeExistingProfessorDirectory();
            if (normalized > 0) {
                log.info("Normalized {} professor department values", normalized);
            }
        } catch (Exception ex) {
            log.error("Failed to normalize professor directory values", ex);
        }
    }
}

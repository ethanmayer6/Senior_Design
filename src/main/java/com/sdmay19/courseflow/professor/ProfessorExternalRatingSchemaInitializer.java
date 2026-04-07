package com.sdmay19.courseflow.professor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.orm.jpa.EntityManagerFactoryDependsOnPostProcessor;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;

@Component
@ConditionalOnProperty(
        value = "courseflow.professors.external-ratings.schema-align.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ProfessorExternalRatingSchemaInitializer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(ProfessorExternalRatingSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public ProfessorExternalRatingSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void afterPropertiesSet() {
        try {
            if (jdbcTemplate.getDataSource() == null) {
                return;
            }

            String databaseProductName;
            try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
                databaseProductName = connection.getMetaData().getDatabaseProductName();
            }
            if (!"PostgreSQL".equalsIgnoreCase(databaseProductName)) {
                return;
            }

            alignProfessorExternalRatingsTable();
            log.info("Aligned professor_external_ratings nullable metric columns for PostgreSQL startup.");
        } catch (Exception ex) {
            log.warn("Skipping professor external ratings schema alignment: {}", ex.getMessage());
        }
    }

    private void alignProfessorExternalRatingsTable() {
        dropNotNull("average_rating");
        dropNotNull("review_count");
        dropNotNull("difficulty_rating");
        dropNotNull("would_take_again_percent");
    }

    private void dropNotNull(String columnName) {
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS professor_external_ratings ALTER COLUMN " + columnName + " DROP NOT NULL");
    }
}

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(
        value = "courseflow.professors.external-ratings.schema-align.enabled",
        havingValue = "true",
        matchIfMissing = true)
class ProfessorExternalRatingEntityManagerDependsOnInitializer extends EntityManagerFactoryDependsOnPostProcessor {

    ProfessorExternalRatingEntityManagerDependsOnInitializer() {
        super("professorExternalRatingSchemaInitializer");
    }
}

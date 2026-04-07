package com.sdmay19.courseflow.schedule;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.orm.jpa.EntityManagerFactoryDependsOnPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;

@Component
@ConditionalOnProperty(
        value = "courseflow.schedule.schema-align.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ClassScheduleSchemaInitializer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(ClassScheduleSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public ClassScheduleSchemaInitializer(JdbcTemplate jdbcTemplate) {
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

            alignClassScheduleTable();
            log.info("Aligned class_schedule_entry custom event columns for PostgreSQL startup.");
        } catch (Exception ex) {
            log.warn("Skipping class schedule schema alignment: {}", ex.getMessage());
        }
    }

    private void alignClassScheduleTable() {
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ADD COLUMN IF NOT EXISTS entry_type VARCHAR(32)");
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ADD COLUMN IF NOT EXISTS custom_event_title TEXT");
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ADD COLUMN IF NOT EXISTS custom_event_date DATE");
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ADD COLUMN IF NOT EXISTS custom_event_notes TEXT");

        jdbcTemplate.execute(
                "UPDATE class_schedule_entry SET entry_type = 'IMPORTED_CLASS' " +
                        "WHERE entry_type IS NULL OR entry_type = ''");
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ALTER COLUMN entry_type SET DEFAULT 'IMPORTED_CLASS'");
        jdbcTemplate.execute(
                "ALTER TABLE IF EXISTS class_schedule_entry " +
                        "ALTER COLUMN entry_type SET NOT NULL");
    }
}

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(
        value = "courseflow.schedule.schema-align.enabled",
        havingValue = "true",
        matchIfMissing = true)
class ClassScheduleEntityManagerDependsOnInitializer extends EntityManagerFactoryDependsOnPostProcessor {

    ClassScheduleEntityManagerDependsOnInitializer() {
        super("classScheduleSchemaInitializer");
    }
}

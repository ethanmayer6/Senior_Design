package com.sdmay19.courseflow.professor;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class ProfessorDirectoryState {

    private final AtomicBoolean seeding = new AtomicBoolean(false);

    public boolean isSeeding() {
        return seeding.get();
    }

    public void setSeeding(boolean value) {
        seeding.set(value);
    }
}

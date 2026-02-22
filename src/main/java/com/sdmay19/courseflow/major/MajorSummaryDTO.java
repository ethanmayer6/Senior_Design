package com.sdmay19.courseflow.major;

public class MajorSummaryDTO {
    private long id;
    private String name;
    private College college;

    public MajorSummaryDTO(long id, String name, College college) {
        this.id = id;
        this.name = name;
        this.college = college;
    }

    public long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public College getCollege() {
        return college;
    }
}


package com.sdmay19.courseflow.degree_requirement;

import jakarta.persistence.*;

@Entity
@Table(name="degree_requirement")
public class DegreeRequirement {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;

    public DegreeRequirement() {}

}

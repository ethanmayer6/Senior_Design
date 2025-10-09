package com.sdmay19.courseflow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;


public interface TestDataRepository extends JpaRepository<TestData, Integer> {

    public List<TestData> findByNameGreaterThan(int value);
}
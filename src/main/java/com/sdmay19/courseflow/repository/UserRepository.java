package com.sdmay19.courseflow.repository;

import com.sdmay19.courseflow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // Implement methods here
}

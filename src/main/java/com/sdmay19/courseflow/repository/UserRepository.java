package com.sdmay19.courseflow.repository;

import com.sdmay19.courseflow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Implement methods here
    Optional<User> findByUsername(String userName);
    Optional<User> findByEmail(String email);
    Optional<User> findById(Long id);
    Optional<User> findByPhone(String phone);
}

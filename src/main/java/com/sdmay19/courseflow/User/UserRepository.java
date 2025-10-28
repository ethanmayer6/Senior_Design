package com.sdmay19.courseflow.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // Implement methods here
    Optional<User> findByUsername(String userName);
    Optional<User> findByEmail(String email);
    Optional<User> findById(Long id);
    Optional<User> findByPhone(String phone);
}

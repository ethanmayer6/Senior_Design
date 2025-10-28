package com.sdmay19.courseflow.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    // Implement methods here
    Optional<AppUser> findByUsername(String userName);
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findById(Long id);
    Optional<AppUser> findByPhone(String phone);
}

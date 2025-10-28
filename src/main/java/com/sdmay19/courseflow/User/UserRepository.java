package com.sdmay19.courseflow.User;

import java.util.Optional;
import com.sdmay19.courseflow.User.AppUser;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    // Implement methods here
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findById(Long id);
    Optional<AppUser> findByPhone(String phone);
}

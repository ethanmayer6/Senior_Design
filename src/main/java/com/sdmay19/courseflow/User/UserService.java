package com.sdmay19.courseflow.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.sdmay19.courseflow.exception.AuthenticationFailedException;
import com.sdmay19.courseflow.exception.UserNotFoundException;
import com.sdmay19.courseflow.model.AuthResponse;
import com.sdmay19.courseflow.model.User;
import com.sdmay19.courseflow.repository.UserRepository;


@Service
public class UserService {

    private static final String EMAIL_REGEX = "^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$";

    @Autowired
    UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    // CREATE SERVICE - still need to add spring security
    public User register(User user) {
        boolean validAccount = checkValidAccount(user);
        if (!validAccount) {
            throw new AuthenticationFailedException("Invalid Email or Password");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    // READ SERVICES
    public AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationFailedException("User with this email address does not exist"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new AuthenticationFailedException("Incorrect password");
        }

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(token, user);
    }
    public User getUserById(long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
    }
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }
    public User getUserByPhone(String phone) {
        return userRepository.findByPhone(phone)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + phone));
    }

    // UPDATE SERVICES
    public void updatePassword(long id, String password) {
        User user = getUserById(id);
        user.setPassword(passwordEncoder.encode(password));
        userRepository.save(user);
    }
    public void updateFirstName(long id, String firstName) {
        User user = getUserById(id);
        user.setFirstName(firstName);
        userRepository.save(user);
    }
    public void updateLastName(long id, String lastName) {
        User user = getUserById(id);
        user.setLastName(lastName);
        userRepository.save(user);
    }
    public void updateMajor(long id, String major) {
        User user = getUserById(id);
        user.setMajor(major);
        userRepository.save(user);
    }
    public void updatePhone(long id, String phone) {
        User user = getUserById(id);
        user.setPhone(phone);
        userRepository.save(user);
    }

    // DELETE SERVICES
    public void deleteById(long id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }
    public void deleteByUsername(String username) {
        User user = getUserByUsername(username);
        userRepository.delete(user);
    }

    // NEW ACCOUNT CHECKING MEASURES
    private boolean checkValidAccount(User user) {
        boolean validEmail = checkEmailFormat(user.getEmail()) && emailNotExists(user.getEmail());
        boolean validPassword = checkPasswordStrength(user.getPassword());
        boolean validUserName = usernameNotExists(user.getUsername());

        return validEmail && validPassword && validUserName;
    }
    private boolean checkEmailFormat(String email) {
        if (email == null || email.isBlank()) return false;
        return email.matches(EMAIL_REGEX);
    }
    private boolean emailNotExists(String email) {
        return userRepository.findByEmail(email).isEmpty();
    }
    private boolean checkPasswordStrength(String password) {
        if (password.length() < 6 || password.length() > 20) {
            return false;
        }
        return true;
    }
    private boolean usernameNotExists(String username) {
        return userRepository.findByUsername(username).isEmpty();
    }


    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Lookup user in your database
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Build and return a Spring Security UserDetails object
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles("USER") // Default role; you can make this dynamic later
                .build();
    }
}

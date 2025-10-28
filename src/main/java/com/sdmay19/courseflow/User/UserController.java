package com.sdmay19.courseflow.user;

import com.sdmay19.courseflow.security.AuthResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        AuthResponse auth = userService.login(email, password);
        return ResponseEntity.ok(auth);
    }

    // CREATE
    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody User user) {
        User savedUser = userService.register(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }

    // READ
    @GetMapping("/id/{id}")
    public ResponseEntity<User> getById(@PathVariable long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
    @GetMapping("/username/{username}")
    public ResponseEntity<User> getByUsername(@PathVariable String username) {
        User user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }
    @GetMapping("/email/{email}")
    public ResponseEntity<User> getByEmail(@PathVariable String email) {
        User user = userService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }
    @GetMapping("/phone/{phone}")
    public ResponseEntity<User> getByPhone(@PathVariable String phone) {
        User user = userService.getUserByPhone(phone);
        return ResponseEntity.ok(user);
    }

    // UPDATE
    @PutMapping("/update/{id}/password")
    public ResponseEntity<Void> updatePassword(@PathVariable long id, @RequestBody Map<String, String> requestBody) {
        String newPassword = requestBody.get("newPassword");
        userService.updatePassword(id, newPassword);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/update/{id}/firstname")
    public ResponseEntity<Void> upddateFirstName(@PathVariable long id, @RequestBody Map<String, String> requestBody) {
        String firstName = requestBody.get("firstName");
        userService.updateFirstName(id, firstName);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/update/{id}/lastname")
    public ResponseEntity<User> upddateLastName(@PathVariable long id, @RequestBody Map<String, String> requestBody) {
        String lastName = requestBody.get("lastName");
        userService.updateLastName(id, lastName);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/update/{id}/major")
    public ResponseEntity<Void> updateMajor(@PathVariable long id, @RequestBody Map<String, String> requestBody) {
        String major = requestBody.get("major");
        userService.updateMajor(id, major);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/update/{id}/phone")
    public ResponseEntity<Void> updatePhone(@PathVariable long id, @RequestBody Map<String, String> requestBody) {
        String phone = requestBody.get("phone");
        userService.updatePhone(id, phone);
        return ResponseEntity.noContent().build();
    }

    // DELETE
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(long id) {
        userService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/delete/{username}")
    public ResponseEntity<Void> delete(String id) {
        userService.deleteByUsername(id);
        return ResponseEntity.noContent().build();
    }
}

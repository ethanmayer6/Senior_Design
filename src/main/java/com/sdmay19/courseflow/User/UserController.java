package com.sdmay19.courseflow.User;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sdmay19.courseflow.security.AuthResponse;

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
    public ResponseEntity<AppUser> registerUser(@RequestBody AppUser user) {
      AppUser savedUser = userService.register(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }

    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmailAvailability(@org.springframework.web.bind.annotation.RequestParam String email) {
        boolean isAvailable = userService.isEmailAvailable(email);
        return ResponseEntity.ok(Map.of("available", isAvailable));
    }

    // READ
    @GetMapping("/me")
    public ResponseEntity<AppUser> getMe(Authentication auth) {
      AppUser u = (AppUser) auth.getPrincipal();
      return ResponseEntity.ok(u);
    }
    // UPDATE
    @PutMapping("/me")
    public ResponseEntity<AppUser> updateUser(Authentication auth, @RequestBody UserUpdator updates) {
        return ResponseEntity.ok(userService.updateUser(((AppUser) auth.getPrincipal()).getId(), updates));
    }

    // DELETE
    @DeleteMapping("/delete")
    public ResponseEntity<Void> delete(Authentication auth) {
      userService.deleteById(((AppUser)auth.getPrincipal()).getId());
      return ResponseEntity.noContent().build();
    }
}

package com.sdmay19.courseflow.User;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import com.sdmay19.courseflow.security.AuthResponse;
import org.springframework.web.multipart.MultipartFile;

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
    @PostMapping("/{id}/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@PathVariable Long id,  @RequestParam("file") MultipartFile file) {
        return userService.uploadProfilePicture(id, file);
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
    @GetMapping("/{id}/picture")
    public ResponseEntity<String> getPicture(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfilePic(id));
    }

    @GetMapping("/search")
    public ResponseEntity<java.util.List<UserSearchResult>> searchUsers(
            Authentication auth,
            @RequestParam String username) {
        AppUser currentUser = (AppUser) auth.getPrincipal();
        return ResponseEntity.ok(userService.searchUsersByUsername(username, currentUser.getId()));
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

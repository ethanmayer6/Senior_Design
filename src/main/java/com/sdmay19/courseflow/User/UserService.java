package com.sdmay19.courseflow.User;

import java.util.List;
import java.util.Map;

import com.sdmay19.courseflow.File.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.sdmay19.courseflow.exception.user.AuthenticationFailedException;
import com.sdmay19.courseflow.exception.user.UserNotFoundException;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.security.AuthResponse;
import com.sdmay19.courseflow.security.JwtService;

import jakarta.transaction.Transactional;
import org.springframework.web.multipart.MultipartFile;


@Service
@Transactional
public class UserService {

    private static final String EMAIL_REGEX = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,63}$";

    private final UserRepository userRepository;
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private MajorRepository majorRepository;

    // CREATE SERVICE - still need to add spring security
    public AppUser register(AppUser user) {
        if (user == null) {
            throw new AuthenticationFailedException("Invalid registration payload.");
        }
        normalizeUserForAuth(user);
        validateRegistrationInput(user);

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("USER");
        return userRepository.save(user);
    }

    // READ SERVICES
    public AuthResponse login(String email, String password) {
      String normalizedEmail = normalizeEmail(email);
      AppUser appUser = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AuthenticationFailedException("User with this email address does not exist"));

        if (password == null || password.isBlank() || !passwordEncoder.matches(password, appUser.getPassword())) {
            throw new AuthenticationFailedException("Incorrect password");
        }

        String token = jwtService.generateToken(appUser.getId());

        return new AuthResponse(token, appUser);
    }
    public AppUser getUserById(long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }
    public AppUser getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }
    public AppUser getUserByPhone(String phone) {
        return userRepository.findByPhone(phone)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + phone));
    }
    public boolean isEmailAvailable(String email) {
        return userRepository.findByEmail(normalizeEmail(email)).isEmpty();
    }

    public String getProfilePic(Long id) {
        AppUser user = getUserById(id);
        return user.getProfilePictureUrl();
    }

    public List<AppUser> getAllUsers() {
      return userRepository.findAll();
    }

    public List<UserSearchResult> searchUsersByUsername(String username, long currentUserId) {
        if (username == null || username.trim().length() < 2) {
            return List.of();
        }

        String normalizedQuery = normalizeEmail(username);
        return userRepository.findByEmailContainingIgnoreCase(normalizedQuery).stream()
                .filter(u -> u.getId() != currentUserId)
                .limit(25)
                .map(u -> new UserSearchResult(
                        u.getId(),
                        u.getUsername(),
                        u.getFirstName(),
                        u.getLastName(),
                        u.getMajor()))
                .toList();
    }

    public UserPreferencesResponse getPreferences(long id) {
        AppUser user = getUserById(id);
        return toPreferencesResponse(user);
    }

    public UserPreferencesResponse updatePreferences(long id, UserPreferencesUpdateRequest updates) {
        AppUser user = getUserById(id);

        if (updates.getDarkMode() != null) {
            user.setDarkMode(updates.getDarkMode());
        }
        if (updates.getThemePreset() != null && !updates.getThemePreset().isBlank()) {
            user.setThemePreset(updates.getThemePreset().trim().toLowerCase());
        }
        if (updates.getFontScale() != null && !updates.getFontScale().isBlank()) {
            user.setFontScale(updates.getFontScale().trim().toLowerCase());
        }
        if (updates.getReducedMotion() != null) {
            user.setReducedMotion(updates.getReducedMotion());
        }

        userRepository.save(user);
        return toPreferencesResponse(user);
    }

    // UPDATE SERVICES
    public AppUser updateUser(long id, UserUpdator updates) {
      AppUser user = getUserById(id);
  
      if (updates.getFirstName() != null) user.setFirstName(updates.getFirstName());
      if (updates.getLastName() != null)  user.setLastName(updates.getLastName());
      if (updates.getMajor() != null)     user.setMajor(updates.getMajor());
      if (updates.getPhone() != null)     user.setPhone(updates.getPhone());
      if (updates.getPassword() != null)
          user.setPassword(passwordEncoder.encode(updates.getPassword()));
  
      return userRepository.save(user);
  }

    public void updatePassword(long id, String password) {
      AppUser user = getUserById(id);
        user.setPassword(passwordEncoder.encode(password));
        userRepository.save(user);
    }
    public void updateFirstName(long id, String firstName) {
      AppUser user = getUserById(id);
        user.setFirstName(firstName);
        userRepository.save(user);
    }
    public void updateLastName(long id, String lastName) {
      AppUser user = getUserById(id);
        user.setLastName(lastName);
        userRepository.save(user);
    }
    public void updateMajor(long id, String major) {
      AppUser user = getUserById(id);
        user.setMajor(major);
        userRepository.save(user);
    }
    public void updatePhone(long id, String phone) {
      AppUser user = getUserById(id);
        user.setPhone(phone);
        userRepository.save(user);
    }

    public void setRole(long id, String role) {
      AppUser user = userRepository.findById(id)
    .orElseThrow(() -> new UserNotFoundException("User not found"));

    user.setRole(role); 
    userRepository.save(user); 
    }

    // DELETE SERVICES
    public void deleteById(long id) {
      AppUser user = getUserById(id);
        userRepository.delete(user);
    }

    // NEW ACCOUNT CHECKING MEASURES
    private void validateRegistrationInput(AppUser user) {
        if (!checkEmailFormat(user.getEmail())) {
            throw new AuthenticationFailedException("Please enter a valid email address.");
        }
        if (!emailNotExists(user.getEmail())) {
            throw new AuthenticationFailedException("An account with this email already exists.");
        }
        if (!isValidMajor(user.getMajor())) {
            throw new AuthenticationFailedException("Please select a valid major.");
        }
        if (!checkPasswordStrength(user.getPassword())) {
            throw new AuthenticationFailedException("Password must be at least 6 characters.");
        }
    }
    private boolean checkEmailFormat(String email) {
        if (email == null || email.isBlank()) return false;
        return email.matches(EMAIL_REGEX);
    }
    private boolean emailNotExists(String email) {
        return userRepository.findByEmail(email).isEmpty();
    }
    private boolean checkPasswordStrength(String password) {
        if (password == null || password.isBlank()) {
            return false;
        }
        if (password.length() < 6) {
            return false;
        }
        return true;
    }

    private boolean isValidMajor(String major) {
        if (major == null || major.isBlank()) {
            return false;
        }
        return majorRepository.findByNameIgnoreCase(major.trim()).isPresent();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private void normalizeUserForAuth(AppUser user) {
        user.setEmail(normalizeEmail(user.getEmail()));
        if (user.getDarkMode() == null) user.setDarkMode(false);
        if (user.getThemePreset() == null || user.getThemePreset().isBlank()) user.setThemePreset("default");
        if (user.getFontScale() == null || user.getFontScale().isBlank()) user.setFontScale("medium");
        if (user.getReducedMotion() == null) user.setReducedMotion(false);
    }

    private UserPreferencesResponse toPreferencesResponse(AppUser user) {
        boolean darkMode = Boolean.TRUE.equals(user.getDarkMode());
        boolean reducedMotion = Boolean.TRUE.equals(user.getReducedMotion());
        String themePreset = (user.getThemePreset() == null || user.getThemePreset().isBlank())
                ? "default"
                : user.getThemePreset().trim().toLowerCase();
        String fontScale = (user.getFontScale() == null || user.getFontScale().isBlank())
                ? "medium"
                : user.getFontScale().trim().toLowerCase();
        return new UserPreferencesResponse(darkMode, themePreset, fontScale, reducedMotion);
    }

    public ResponseEntity<?> uploadProfilePicture(Long id, MultipartFile file) {
        try {
            AppUser user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String url = fileStorageService.saveProfilePicture(file, id);
            user.setProfilePictureUrl(url);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("profilePictureUrl", url));

        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }
}

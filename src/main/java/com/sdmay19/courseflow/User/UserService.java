package com.sdmay19.courseflow.User;

import java.util.List;
import java.util.Map;
import java.util.Locale;

import com.sdmay19.courseflow.File.FileStorageService;
import com.sdmay19.courseflow.course.CourseRepository;
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

    @Autowired
    private CourseRepository courseRepository;

    // CREATE SERVICE - still need to add spring security
    public AppUser register(AppUser user) {
        if (user == null) {
            throw new AuthenticationFailedException("Invalid registration payload.");
        }
        normalizeUserForAuth(user);
        validateRegistrationInput(user);

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(normalizeRegistrationRole(user.getRole()));
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
        AppUser currentUser = getUserById(currentUserId);
        return userRepository.findByEmailContainingIgnoreCase(normalizedQuery).stream()
                .filter(u -> u.getId() != currentUserId)
                .limit(25)
                .map(u -> toUserSearchResult(u, currentUser.getFriends().stream().anyMatch(friend -> friend.getId() == u.getId())))
                .toList();
    }

    public List<UserSearchResult> getFriends(long currentUserId) {
        AppUser currentUser = getUserById(currentUserId);
        return currentUser.getFriends().stream()
                .map(u -> toUserSearchResult(u, true))
                .sorted((a, b) -> String.valueOf(a.username()).compareToIgnoreCase(String.valueOf(b.username())))
                .toList();
    }

    public void addFriend(long currentUserId, long friendId) {
        if (currentUserId == friendId) {
            throw new AuthenticationFailedException("You cannot add yourself as a friend.");
        }

        AppUser currentUser = getUserById(currentUserId);
        AppUser friend = getUserById(friendId);

        if (currentUser.getFriends().stream().noneMatch(existing -> existing.getId() == friendId)) {
            currentUser.getFriends().add(friend);
            userRepository.save(currentUser);
        }
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
      if (updates.getPreferredName() != null) user.setPreferredName(normalizeOptionalText(updates.getPreferredName(), 60));
      if (updates.getProfileHeadline() != null) user.setProfileHeadline(normalizeOptionalText(updates.getProfileHeadline(), 160));
      if (updates.getBio() != null) user.setBio(normalizeOptionalText(updates.getBio(), 1200));
      if (updates.getAccentColor() != null) user.setAccentColor(normalizeAccentColor(updates.getAccentColor()));
      if (updates.getProfileVisibility() != null) user.setProfileVisibility(normalizeProfileVisibility(updates.getProfileVisibility()));
      if (updates.getShowMajorToFriends() != null) user.setShowMajorToFriends(updates.getShowMajorToFriends());
      if (updates.getShowEmailToFriends() != null) user.setShowEmailToFriends(updates.getShowEmailToFriends());
      if (updates.getShowPhoneToFriends() != null) user.setShowPhoneToFriends(updates.getShowPhoneToFriends());
      if (updates.getSelectedBadgeCourseIdent() != null) {
          user.setSelectedBadgeCourseIdent(normalizeSelectedBadgeCourseIdent(updates.getSelectedBadgeCourseIdent()));
          validateSelectedBadgeCourseIdent(user.getSelectedBadgeCourseIdent());
      }
      if (updates.getPassword() != null)
          user.setPassword(passwordEncoder.encode(updates.getPassword()));

      normalizeUserForAuth(user);
  
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

    user.setRole(normalizeRoleForStorage(role));
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

    private String normalizeRoleForStorage(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return "USER";
        }

        String normalized = requestedRole.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring("ROLE_".length());
        }

        return switch (normalized) {
            case "USER", "STUDENT" -> "USER";
            case "ADVISOR" -> "ADVISOR";
            case "FACULTY" -> "FACULTY";
            case "ADMIN" -> "ADMIN";
            default -> "USER";
        };
    }

    private String normalizeRegistrationRole(String requestedRole) {
        String normalized = normalizeRoleForStorage(requestedRole);
        // Public registration cannot self-assign admin.
        if ("ADMIN".equals(normalized)) {
            return "USER";
        }
        return normalized;
    }

    private void normalizeUserForAuth(AppUser user) {
        user.setEmail(normalizeEmail(user.getEmail()));
        if (user.getDarkMode() == null) user.setDarkMode(false);
        if (user.getThemePreset() == null || user.getThemePreset().isBlank()) user.setThemePreset("default");
        if (user.getFontScale() == null || user.getFontScale().isBlank()) user.setFontScale("medium");
        if (user.getReducedMotion() == null) user.setReducedMotion(false);
        user.setPreferredName(normalizeOptionalText(user.getPreferredName(), 60));
        user.setProfileHeadline(normalizeOptionalText(user.getProfileHeadline(), 160));
        user.setBio(normalizeOptionalText(user.getBio(), 1200));
        user.setAccentColor(normalizeAccentColor(user.getAccentColor()));
        user.setProfileVisibility(normalizeProfileVisibility(user.getProfileVisibility()));
        if (user.getShowMajorToFriends() == null) user.setShowMajorToFriends(true);
        if (user.getShowEmailToFriends() == null) user.setShowEmailToFriends(false);
        if (user.getShowPhoneToFriends() == null) user.setShowPhoneToFriends(false);
        user.setSelectedBadgeCourseIdent(normalizeSelectedBadgeCourseIdent(user.getSelectedBadgeCourseIdent()));
        validateSelectedBadgeCourseIdent(user.getSelectedBadgeCourseIdent());
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

    private UserSearchResult toUserSearchResult(AppUser user, boolean isFriend) {
        boolean everyoneVisible = "EVERYONE".equalsIgnoreCase(normalizeProfileVisibility(user.getProfileVisibility()));
        boolean canSeeExtended = isFriend || everyoneVisible;
        boolean showMajorToFriends = user.getShowMajorToFriends() == null || Boolean.TRUE.equals(user.getShowMajorToFriends());
        boolean showEmailToFriends = Boolean.TRUE.equals(user.getShowEmailToFriends());
        boolean showPhoneToFriends = Boolean.TRUE.equals(user.getShowPhoneToFriends());
        String firstName = normalizeOptionalText(user.getFirstName(), 80);
        String lastName = normalizeOptionalText(user.getLastName(), 80);
        String preferredName = normalizeOptionalText(user.getPreferredName(), 60);
        String displayName = preferredName != null
                ? preferredName
                : normalizeOptionalText(((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim(), 160);

        return new UserSearchResult(
                user.getId(),
                user.getUsername(),
                firstName,
                lastName,
                preferredName,
                displayName,
                canSeeExtended && showMajorToFriends ? normalizeOptionalText(user.getMajor(), 160) : null,
                canSeeExtended && showEmailToFriends ? normalizeOptionalText(user.getEmail(), 160) : null,
                canSeeExtended && showPhoneToFriends ? normalizeOptionalText(user.getPhone(), 40) : null,
                canSeeExtended ? normalizeOptionalText(user.getProfileHeadline(), 160) : null,
                canSeeExtended ? normalizeOptionalText(user.getBio(), 1200) : null,
                normalizeAccentColor(user.getAccentColor()),
                user.getProfilePictureUrl(),
                canSeeExtended ? normalizeSelectedBadgeCourseIdent(user.getSelectedBadgeCourseIdent()) : null);
    }

    private String normalizeOptionalText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private String normalizeAccentColor(String color) {
        if (color == null || color.isBlank()) {
            return "#dc2626";
        }
        String trimmed = color.trim();
        if (trimmed.matches("^#([A-Fa-f0-9]{6})$")) {
            return trimmed.toLowerCase(Locale.ROOT);
        }
        return "#dc2626";
    }

    private String normalizeProfileVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            return "EVERYONE";
        }
        String normalized = visibility.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "EVERYONE", "FRIENDS_ONLY" -> normalized;
            default -> "EVERYONE";
        };
    }

    private String normalizeSelectedBadgeCourseIdent(String value) {
        if (value == null) {
            return null;
        }

        String compact = value.trim().toUpperCase(Locale.ROOT);
        if (compact.isEmpty()) {
            return null;
        }

        compact = compact.replaceAll("[\\s-]+", "_").replaceAll("_+", "_");
        String collapsed = compact.replace("_", "");
        if (collapsed.matches("^[A-Z]{2,8}\\d{4}[A-Z]?$")) {
            String department = collapsed.replaceAll("\\d.*$", "");
            String code = collapsed.substring(department.length());
            return department + "_" + code;
        }

        return compact;
    }

    private void validateSelectedBadgeCourseIdent(String selectedBadgeCourseIdent) {
        if (selectedBadgeCourseIdent == null || selectedBadgeCourseIdent.isBlank()) {
            return;
        }
        if (courseRepository.findByCourseIdent(selectedBadgeCourseIdent).isEmpty()) {
            throw new IllegalArgumentException("Enter a valid course ident for the featured badge.");
        }
    }
}

package com.sdmay19.courseflow.User;

import com.sdmay19.courseflow.File.FileStorageService;
import com.sdmay19.courseflow.exception.user.AuthenticationFailedException;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.security.AuthResponse;
import com.sdmay19.courseflow.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private MajorRepository majorRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
        ReflectionTestUtils.setField(userService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(userService, "jwtService", jwtService);
        ReflectionTestUtils.setField(userService, "fileStorageService", fileStorageService);
        ReflectionTestUtils.setField(userService, "majorRepository", majorRepository);
    }

    @Test
    void register_normalizesEmail_defaultsPreferences_andPreventsAdminSelfAssignment() {
        AppUser request = new AppUser();
        request.setEmail(" Student@Example.edu ");
        request.setPassword("secret1");
        request.setRole("ADMIN");
        request.setMajor("Software Engineering");

        when(userRepository.findByEmail("student@example.edu")).thenReturn(Optional.empty());
        when(majorRepository.findByNameIgnoreCase("Software Engineering")).thenReturn(Optional.of(new Major()));
        when(passwordEncoder.encode("secret1")).thenReturn("encoded-password");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser saved = userService.register(request);

        assertThat(saved.getEmail()).isEqualTo("student@example.edu");
        assertThat(saved.getPassword()).isEqualTo("encoded-password");
        assertThat(saved.getRole()).isEqualTo("USER");
        assertThat(saved.getDarkMode()).isFalse();
        assertThat(saved.getThemePreset()).isEqualTo("default");
        assertThat(saved.getFontScale()).isEqualTo("medium");
        assertThat(saved.getReducedMotion()).isFalse();
    }

    @Test
    void register_rejectsUnknownMajor() {
        AppUser request = new AppUser();
        request.setEmail("student@example.edu");
        request.setPassword("secret1");
        request.setRole("USER");
        request.setMajor("Unknown Major");

        when(userRepository.findByEmail("student@example.edu")).thenReturn(Optional.empty());
        when(majorRepository.findByNameIgnoreCase("Unknown Major")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.register(request))
                .isInstanceOf(AuthenticationFailedException.class)
                .hasMessageContaining("valid major");

        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void login_normalizesEmail_andReturnsGeneratedToken() {
        AppUser existing = new AppUser();
        existing.setId(12L);
        existing.setEmail("student@example.edu");
        existing.setPassword("encoded-password");

        when(userRepository.findByEmail("student@example.edu")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("secret1", "encoded-password")).thenReturn(true);
        when(jwtService.generateToken(12L)).thenReturn("jwt-token");

        AuthResponse response = userService.login(" Student@Example.edu ", "secret1");

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.user()).isSameAs(existing);
    }

    @Test
    void updatePreferences_normalizesCase_andPersistsUpdates() {
        AppUser existing = new AppUser();
        existing.setId(9L);
        existing.setDarkMode(false);
        existing.setThemePreset("default");
        existing.setFontScale("medium");
        existing.setReducedMotion(false);

        UserPreferencesUpdateRequest updates = new UserPreferencesUpdateRequest();
        updates.setDarkMode(true);
        updates.setThemePreset(" OCEAN ");
        updates.setFontScale(" LARGE ");
        updates.setReducedMotion(true);

        when(userRepository.findById(9L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserPreferencesResponse response = userService.updatePreferences(9L, updates);

        assertThat(response.darkMode()).isTrue();
        assertThat(response.themePreset()).isEqualTo("ocean");
        assertThat(response.fontScale()).isEqualTo("large");
        assertThat(response.reducedMotion()).isTrue();
        assertThat(existing.getThemePreset()).isEqualTo("ocean");
        assertThat(existing.getFontScale()).isEqualTo("large");
    }

    @Test
    void addFriend_rejectsAddingSelf() {
        assertThatThrownBy(() -> userService.addFriend(4L, 4L))
                .isInstanceOf(AuthenticationFailedException.class)
                .hasMessageContaining("cannot add yourself");
    }

    @Test
    void getFriends_returnsAlphabetizedSearchResults() {
        AppUser currentUser = new AppUser();
        currentUser.setId(3L);

        AppUser zed = new AppUser();
        zed.setId(8L);
        zed.setEmail("zed@example.edu");
        zed.setFirstName("Zed");
        zed.setLastName("Alpha");
        zed.setMajor("SE");

        AppUser amy = new AppUser();
        amy.setId(7L);
        amy.setEmail("amy@example.edu");
        amy.setFirstName("Amy");
        amy.setLastName("Beta");
        amy.setMajor("SE");

        currentUser.setFriends(new HashSet<>(List.of(zed, amy)));

        when(userRepository.findById(3L)).thenReturn(Optional.of(currentUser));

        List<UserSearchResult> friends = userService.getFriends(3L);

        assertThat(friends).extracting(UserSearchResult::username)
                .containsExactly("amy@example.edu", "zed@example.edu");
    }
}

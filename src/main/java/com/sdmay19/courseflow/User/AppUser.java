package com.sdmay19.courseflow.User;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sdmay19.courseflow.flowchart.Flowchart;
import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
public class AppUser implements UserDetails {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;
    @Column(name = "first_name")
    private String firstName;
    @Column(name = "last_name")
    private String lastName;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private String phone;
    private String major;
    private String role;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(name = "preferred_name")
    private String preferredName;
    @Column(name = "profile_headline", length = 160)
    private String profileHeadline;
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;
    @Column(name = "accent_color", length = 16)
    private String accentColor;
    @Column(name = "profile_visibility", length = 32)
    private String profileVisibility;
    @Column(name = "show_major_to_friends")
    private Boolean showMajorToFriends;
    @Column(name = "show_email_to_friends")
    private Boolean showEmailToFriends;
    @Column(name = "show_phone_to_friends")
    private Boolean showPhoneToFriends;
    private Boolean darkMode;
    private String themePreset;
    private String fontScale;
    private Boolean reducedMotion;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Flowchart> flowcharts;

    @ManyToMany
    @JoinTable(
            name = "user_friends",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "friend_id"))
    @JsonIgnore
    private Set<AppUser> friends = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
    
    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return true; }

    private String profilePictureUrl; // store path or URL


    public AppUser() {}

    public AppUser(String firstName, String lastName, String password, String email, String phone, String major, List<Flowchart> flowcharts, String profilePictureUrl) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.password = password;
        this.email = email;
        this.phone = phone;
        this.major = major;
        this.role = "USER";
        this.flowcharts = flowcharts;
        this.profilePictureUrl = profilePictureUrl;
        this.preferredName = null;
        this.profileHeadline = null;
        this.bio = null;
        this.accentColor = "#dc2626";
        this.profileVisibility = "EVERYONE";
        this.showMajorToFriends = true;
        this.showEmailToFriends = false;
        this.showPhoneToFriends = false;
        this.darkMode = false;
        this.themePreset = "default";
        this.fontScale = "medium";
        this.reducedMotion = false;
    }

    // GETTERS
    public long getId() {
        return id;
    }
    public String getFirstName() {
        return firstName;
    }
    public String getLastName() {
        return lastName;
    }
    public String getPassword() {
        return password;
    }
    public String getEmail() {
        return email;
    }
    public String getPhone() {
        return phone;
    }
    public String getMajor() {
        return major;
    }
    public String getPreferredName() { return preferredName; }
    public String getProfileHeadline() { return profileHeadline; }
    public String getBio() { return bio; }
    public String getAccentColor() { return accentColor; }
    public String getProfileVisibility() { return profileVisibility; }
    public Boolean getShowMajorToFriends() { return showMajorToFriends; }
    public Boolean getShowEmailToFriends() { return showEmailToFriends; }
    public Boolean getShowPhoneToFriends() { return showPhoneToFriends; }
    @Override // idk why we need this but the class gets mad without it.
    public String getUsername() {
        return email;
    }
    public String getRole() {
        return role;
    }
    public Boolean getDarkMode() { return darkMode; }
    public String getThemePreset() { return themePreset; }
    public String getFontScale() { return fontScale; }
    public Boolean getReducedMotion() { return reducedMotion; }
    public List<Flowchart> getFlowcharts() { return flowcharts; }
    public Set<AppUser> getFriends() { return friends; }
    public String getProfilePictureUrl() { return profilePictureUrl; }

    // SETTERS
    public void setId(long id) {
        this.id = id;
    }
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public void setEmail(String email) {
        this.email = email;
    }
    public void setPhone(String phone) {
        this.phone = phone;
    }
    public void setMajor(String major) {
        this.major = major;
    }
    public void setPreferredName(String preferredName) { this.preferredName = preferredName; }
    public void setProfileHeadline(String profileHeadline) { this.profileHeadline = profileHeadline; }
    public void setBio(String bio) { this.bio = bio; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }
    public void setProfileVisibility(String profileVisibility) { this.profileVisibility = profileVisibility; }
    public void setShowMajorToFriends(Boolean showMajorToFriends) { this.showMajorToFriends = showMajorToFriends; }
    public void setShowEmailToFriends(Boolean showEmailToFriends) { this.showEmailToFriends = showEmailToFriends; }
    public void setShowPhoneToFriends(Boolean showPhoneToFriends) { this.showPhoneToFriends = showPhoneToFriends; }
    public void setDarkMode(Boolean darkMode) { this.darkMode = darkMode; }
    public void setThemePreset(String themePreset) { this.themePreset = themePreset; }
    public void setFontScale(String fontScale) { this.fontScale = fontScale; }
    public void setReducedMotion(Boolean reducedMotion) { this.reducedMotion = reducedMotion; }
    public void setFlowcharts(List<Flowchart> flowcharts) { this.flowcharts = flowcharts; }
    public void setFriends(Set<AppUser> friends) { this.friends = friends; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }



    public void setRole(String role) {
        this.role = role;
    }

}

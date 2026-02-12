package com.sdmay19.courseflow.User;

import java.util.Collection;
import java.util.List;

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
    private Boolean darkMode;
    private String themePreset;
    private String fontScale;
    private Boolean reducedMotion;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Flowchart> flowcharts;

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
    public void setDarkMode(Boolean darkMode) { this.darkMode = darkMode; }
    public void setThemePreset(String themePreset) { this.themePreset = themePreset; }
    public void setFontScale(String fontScale) { this.fontScale = fontScale; }
    public void setReducedMotion(Boolean reducedMotion) { this.reducedMotion = reducedMotion; }
    public void setFlowcharts(List<Flowchart> flowcharts) { this.flowcharts = flowcharts; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }



    public void setRole(String role) {
        this.role = role;
    }

}

package com.sdmay19.courseflow.User;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.sdmay19.courseflow.exception.AuthenticationFailedException;
import com.sdmay19.courseflow.exception.UserNotFoundException;
import com.sdmay19.courseflow.security.AuthResponse;
import com.sdmay19.courseflow.security.JwtService;

import jakarta.transaction.Transactional;


@Service
@Transactional
public class UserService {

    private static final String EMAIL_REGEX = "^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}$";

    @Autowired
    UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    // CREATE SERVICE - still need to add spring security
    public AppUser register(AppUser user) {
        boolean validAccount = checkValidAccount(user);
        if (!validAccount) {
            throw new AuthenticationFailedException("Invalid Email or Password");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("USER");
        return userRepository.save(user);
    }

    // READ SERVICES
    public AuthResponse login(String email, String password) {
      AppUser appUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationFailedException("User with this email address does not exist"));

        if (!passwordEncoder.matches(password, appUser.getPassword())) {
            throw new AuthenticationFailedException("Incorrect password");
        }

        String token = jwtService.generateToken(appUser.getEmail());

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
        return userRepository.findByEmail(email).isEmpty();
    }

    public List<AppUser> getAllUsers() {
      return userRepository.findAll();
    }

    // UPDATE SERVICES
    public AppUser updateUser(long id, UserUpdator updates) {
      AppUser user = getUserById(id);
  
      if (updates.getFirstName() != null) user.setFirstName(updates.getFirstName());
      if (updates.getLastName() != null)  user.setLastName(updates.getLastName());
      if (updates.getMajor() != null)     user.setMajor(updates.getMajor());
      if (updates.getPhone() != null)     user.setPhone(updates.getPhone());
      if (updates.getPassword() != null)
          user.setPassword(updates.getPassword());
  
      return userRepository.save(user);
  }

    public void updatePassword(long id, String password) {
      AppUser user = getUserById(id);
        user.setPassword(password);
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
    private boolean checkValidAccount(AppUser user) {
        boolean validEmail = checkEmailFormat(user.getEmail()) && emailNotExists(user.getEmail());
        boolean validPassword = checkPasswordStrength(user.getPassword());

        return validEmail && validPassword;
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
}

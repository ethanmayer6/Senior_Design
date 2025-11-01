package com.sdmay19.courseflow.User;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/admin")
public class AdminController {


    @Autowired
    private ObjectMapper objectMapper;

  @Autowired
  UserService userService;
  

  @GetMapping("/users")
  public ResponseEntity<List<AppUser>> getAllUsers() {
    return ResponseEntity.ok(userService.getAllUsers());
  }

  @GetMapping("/user/{id}")
  public ResponseEntity<AppUser> getUser(@PathVariable Long id) {
      AppUser user = userService.getUserById(id);
      return ResponseEntity.ok(user);
  }

  @PutMapping("/user")
  public ResponseEntity<AppUser> updateUser(@RequestBody Map<String, Object> body) {
      long id = ((Number) body.get("id")).longValue();
      UserUpdator updates = objectMapper.convertValue(body, UserUpdator.class);
      userService.updateUser(id, updates);
      AppUser user = userService.getUserById(id);
      return ResponseEntity.ok(user);
  }


  @PutMapping("/setRole")
  public ResponseEntity<AppUser> setRole(@RequestBody Map<String, Object> body) {
    long id = getIdFromBody(body);
    String newRole = (String) body.get("role");
    userService.setRole(id, newRole);
    AppUser user = userService.getUserById(id);
    return ResponseEntity.ok(user);
  }

  @DeleteMapping("/user")
    public ResponseEntity<Void> delete(@RequestBody Map<String, Object> body) {
      long id = getIdFromBody(body);
      userService.deleteById(id);
      return ResponseEntity.noContent().build();
    }

  // HELPER METHODS
  private long getIdFromBody(Map<String, Object> body) {
    Number idNumber = (Number) body.get("id");
    long id = idNumber.longValue();
    return id;
  }

}
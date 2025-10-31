package com.sdmay19.courseflow.User;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  @Autowired
  UserService userService;
  

  @GetMapping("/users")
  public ResponseEntity<List<AppUser>> getAllUsers() {
    return ResponseEntity.ok(userService.getAllUsers());
  }

  @PutMapping("/setRole")
  public ResponseEntity<Void> setRole(@RequestBody Map<String, Object> body) {
    Number idNumber = (Number) body.get("id");
    long id = idNumber.longValue();
    String newRole = (String) body.get("role");
    System.out.println(id);
    System.out.println(id);
    userService.setRole(id, newRole);
    return ResponseEntity.noContent().build();
  }

}
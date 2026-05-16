package com.example.Ai_Expense_Tracker.controller;

import com.example.Ai_Expense_Tracker.dto.LoginRequest;
import com.example.Ai_Expense_Tracker.dto.RegisterRequest;
import com.example.Ai_Expense_Tracker.dto.UserDTO;
import com.example.Ai_Expense_Tracker.entity.User;
import com.example.Ai_Expense_Tracker.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<UserDTO> register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail().trim());
        user.setFullName(request.getFullName().trim());
        return new ResponseEntity<>(userService.registerUser(user), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        Map<String, Object> response = userService.loginUser(
                request.getUsername().trim(),
                request.getPassword()
        );

        if ((boolean) response.get("success")) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }
}

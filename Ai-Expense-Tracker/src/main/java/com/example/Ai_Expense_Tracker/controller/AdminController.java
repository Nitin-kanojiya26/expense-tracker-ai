package com.example.Ai_Expense_Tracker.controller;

import com.example.Ai_Expense_Tracker.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    @PutMapping("/users/{userId}/lock")
    public Map<String, Object> lockUser(@PathVariable Long userId) {
        return userService.setUserLocked(userId, true);
    }

    @PutMapping("/users/{userId}/unlock")
    public Map<String, Object> unlockUser(@PathVariable Long userId) {
        return userService.setUserLocked(userId, false);
    }
}

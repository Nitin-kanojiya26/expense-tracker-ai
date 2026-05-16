package com.example.Ai_Expense_Tracker.service;

import com.example.Ai_Expense_Tracker.dto.UserDTO;
import com.example.Ai_Expense_Tracker.entity.Role;
import com.example.Ai_Expense_Tracker.entity.User;
import com.example.Ai_Expense_Tracker.repository.UserRepository;
import com.example.Ai_Expense_Tracker.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDTO registerUser(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists!");
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists!");
        }

        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            user.setRoles(Set.of(Role.ROLE_USER));
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    public UserDTO getUserById(Long id) {
        requireOwnerOrAdmin(id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found!"));
        return convertToDTO(user);
    }

    public Map<String, Object> loginUser(String username, String password) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.isLocked()) {
                response.put("success", false);
                response.put("message", "User is locked!");
                return response;
            }
            if (passwordEncoder.matches(password, user.getPassword())) {
                response.put("success", true);
                response.put("message", "Login successful!");
                response.put("userId", user.getId());
                response.put("username", user.getUsername());
                response.put("fullName", user.getFullName());
            } else {
                response.put("success", false);
                response.put("message", "Invalid password!");
            }
        } else {
            response.put("success", false);
            response.put("message", "User not found!");
        }

        return response;
    }

    public Map<String, Object> setUserLocked(Long userId, boolean locked) {
        if (!SecurityUtil.hasRole("ROLE_ADMIN")) {
            throw new AccessDeniedException("Access denied");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found!"));
        user.setLocked(locked);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("userId", user.getId());
        response.put("locked", user.isLocked());
        return response;
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream()
                    .map(Enum::name)
                    .collect(Collectors.toSet()));
        }
        return dto;
    }

    private void requireOwnerOrAdmin(Long userId) {
        if (SecurityUtil.hasRole("ROLE_ADMIN")) {
            return;
        }
        String username = SecurityUtil.currentUsername();
        if (username == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        User current = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found!"));
        if (!current.getId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
    }
}

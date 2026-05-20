package com.example.Ai_Expense_Tracker.dto;



import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {

    private boolean success;

    private String message;

    private String token;

    private Long userId;

    private String username;

    private String fullName;
}
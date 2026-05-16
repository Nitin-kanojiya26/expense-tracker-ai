package com.example.Ai_Expense_Tracker.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ExpenseDTO {
    private Long id;
    private String description;
    private Double amount;
    private LocalDate date;
    private String categoryName;
    private String notes;
}
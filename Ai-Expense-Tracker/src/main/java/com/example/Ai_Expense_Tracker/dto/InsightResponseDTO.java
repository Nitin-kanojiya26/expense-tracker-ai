package com.example.Ai_Expense_Tracker.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InsightResponseDTO {
    private String insights;
    private double totalSpent;
    private long totalTransactions;
    private double dailyAverage;
}
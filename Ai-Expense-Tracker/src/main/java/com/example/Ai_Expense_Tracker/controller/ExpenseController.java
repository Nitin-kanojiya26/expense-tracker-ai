package com.example.Ai_Expense_Tracker.controller;


import com.example.Ai_Expense_Tracker.dto.ExpenseDTO;
import com.example.Ai_Expense_Tracker.dto.SummaryDTO;
import com.example.Ai_Expense_Tracker.entity.Expense;
import com.example.Ai_Expense_Tracker.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {
    private final ExpenseService expenseService;

    @PostMapping("/user/{userId}")
    public ResponseEntity<ExpenseDTO> addExpense(
            @PathVariable Long userId,
            @RequestBody Expense expense,
            @RequestParam(required = false) Long categoryId) {
        return new ResponseEntity<>(
                expenseService.addExpense(userId, expense, categoryId),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ExpenseDTO>> getUserExpenses(@PathVariable Long userId) {
        return ResponseEntity.ok(expenseService.getUserExpenses(userId));
    }

    @GetMapping("/user/{userId}/summary")
    public ResponseEntity<SummaryDTO> getSummary(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(expenseService.getSummary(userId, startDate, endDate));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long expenseId) {
        expenseService.deleteExpense(expenseId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseDTO> updateExpense(
            @PathVariable Long expenseId,
            @RequestBody Expense expense,
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(expenseService.updateExpense(expenseId, expense, categoryId));
    }
}

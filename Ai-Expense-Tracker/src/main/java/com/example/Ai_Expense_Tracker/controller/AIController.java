package com.example.Ai_Expense_Tracker.controller;

import com.example.Ai_Expense_Tracker.ai.CategorySuggestionService;
import com.example.Ai_Expense_Tracker.ai.GeminiClient;
import com.example.Ai_Expense_Tracker.ai.SpendingInsightService;
import com.example.Ai_Expense_Tracker.entity.Category;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AIController {

    private final GeminiClient geminiClient;
    private final CategorySuggestionService categorySuggestionService;
    private final SpendingInsightService spendingInsightService;
    @GetMapping("/test")
    public ResponseEntity<String> testGemini(@RequestParam String prompt) {
        log.info("AI test endpoint called with prompt: {}", prompt);
        String response = geminiClient.askGemini(prompt);
        return ResponseEntity.ok(response);
    }

    // Feature 2 - Suggest Category
    @PostMapping("/suggest-category")
    public ResponseEntity<String> suggestCategory(@RequestBody Map<String, String> body) {
        String description = body.get("description");
        if (description == null || description.isEmpty()) {
            return ResponseEntity.badRequest().body("Description is required");
        }
        log.info("Suggesting category for: {}", description);
        Category suggested = categorySuggestionService.suggestCategory(description);
        if (suggested != null) {
            return ResponseEntity.ok("Suggested Category: " + suggested.getName());
        }
        return ResponseEntity.ok("AI unavailable - please try again in 1 minute");
    }
    // Feature 3 - Get Spending Insights (will be used later)
    // GET http://localhost:8080/api/ai/insights?userId=1
    @GetMapping("/insights")
    public ResponseEntity<String> getInsights(@RequestParam Long userId) {
        log.info("Getting spending insights for user: {}", userId);
        String insights = spendingInsightService.getSpendingInsights(userId);
        return ResponseEntity.ok(insights);
    }

    // Feature 4 - Natural Language Query (will be used later)
    // POST http://localhost:8080/api/ai/query?userId=1
    // Body: { "question": "How much did I spend on food last week?" }
    @PostMapping("/query")
    public ResponseEntity<String> queryExpenses(
            @RequestParam Long userId,
            @RequestBody Map<String, String> body) {
        String question = body.get("question");
        if (question == null || question.isEmpty()) {
            return ResponseEntity.badRequest().body("Question is required");
        }
        log.info("Natural language query for user {}: {}", userId, question);
        // Full logic will be added in Feature 4
        return ResponseEntity.ok("Query feature coming soon!");
    }

    // Feature 5 - Budget Prediction (will be used later)
    // GET http://localhost:8080/api/ai/predict?userId=1
    @GetMapping("/predict")
    public ResponseEntity<String> predictBudget(@RequestParam Long userId) {
        log.info("Predicting budget for user: {}", userId);
        // Full logic will be added in Feature 5
        return ResponseEntity.ok("Prediction feature coming soon!");
    }
}
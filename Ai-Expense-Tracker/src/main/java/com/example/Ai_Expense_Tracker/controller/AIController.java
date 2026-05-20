package com.example.Ai_Expense_Tracker.controller;

import com.example.Ai_Expense_Tracker.ai.*;
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
    private final NaturalLanguageQueryService nlQueryService;
    private final BudgetPredictionService budgetPredictionService;
    @GetMapping("/test")
    public ResponseEntity<String> testGemini(@RequestParam String prompt) {
        log.info("AI test endpoint called with prompt: {}", prompt);
        String response = geminiClient.askGemini(prompt);
        return ResponseEntity.ok(response);
    }

    // Suggest Category
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
    //  Get Spending Insights (will be used later)
    // GET http://localhost:8080/api/ai/insights?userId=1
    @GetMapping("/insights")
    public ResponseEntity<String> getInsights(@RequestParam Long userId) {
        log.info("Getting spending insights for user: {}", userId);
        String insights = spendingInsightService.getSpendingInsights(userId);
        return ResponseEntity.ok(insights);
    }

    // Natural Language Query
    // Body: { "question": "How much did I spend on food last week?" }
    @PostMapping("/query")
    public ResponseEntity<String> queryExpenses(
            @RequestParam Long userId,
            @RequestBody Map<String, String> body) {

        String question = body.get("question");
        if (question == null || question.isEmpty()) {
            return ResponseEntity.badRequest().body("Question is required");
        }
        log.info("Query for user {}: {}", userId, question);
        String answer = nlQueryService.answerQuery(userId, question);
        return ResponseEntity.ok(answer);
    }

    //  Budget Prediction
    @GetMapping("/predict")
    public ResponseEntity<String> predictBudget(@RequestParam Long userId) {
        log.info("Predicting budget for user: {}", userId);
        String prediction = budgetPredictionService.predictNextMonthBudget(userId);
        return ResponseEntity.ok(prediction);
    }
}
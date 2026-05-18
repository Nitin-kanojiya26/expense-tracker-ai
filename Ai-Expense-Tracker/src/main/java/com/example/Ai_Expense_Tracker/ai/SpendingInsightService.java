package com.example.Ai_Expense_Tracker.ai;

import com.example.Ai_Expense_Tracker.entity.Expense;
import com.example.Ai_Expense_Tracker.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpendingInsightService {

    private final GeminiClient geminiClient;
    private final ExpenseRepository expenseRepository;

    /**
     * Fetches last 30 days expenses for user
     * Sends summary to Gemini
     * Returns AI generated spending insights and tips
     */
    public String getSpendingInsights(Long userId) {
        try {
            //  Get last 30 days expenses
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(30);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            //  Check if user has expenses
            if (expenses.isEmpty()) {
                return "No expenses found in last 30 days. " +
                        "Start adding expenses to get AI powered insights!";
            }

            // Calculate total spending
            double total = expenses.stream()
                    .mapToDouble(Expense::getAmount)
                    .sum();

            // Group expenses by category
            Map<String, Double> categoryWise = expenses.stream()
                    .filter(e -> e.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            e -> e.getCategory().getName(),
                            Collectors.summingDouble(Expense::getAmount)
                    ));

            // Count uncategorized expenses
            long uncategorized = expenses.stream()
                    .filter(e -> e.getCategory() == null)
                    .count();

            // Build expense summary for Gemini
            StringBuilder summary = new StringBuilder();
            summary.append("My expense summary for last 30 days:\n");
            summary.append("Total spent: Rs ").append(String.format("%.2f", total)).append("\n");
            summary.append("Number of transactions: ").append(expenses.size()).append("\n");
            summary.append("Average per day: Rs ")
                    .append(String.format("%.2f", total / 30)).append("\n");

            if (!categoryWise.isEmpty()) {
                summary.append("\nCategory wise breakdown:\n");
                categoryWise.forEach((category, amount) -> {
                    double percentage = (amount / total) * 100;
                    summary.append("- ").append(category)
                            .append(": Rs ").append(String.format("%.2f", amount))
                            .append(" (").append(String.format("%.1f", percentage)).append("%)\n");
                });
            }

            if (uncategorized > 0) {
                summary.append("- Uncategorized: ").append(uncategorized)
                        .append(" transactions\n");
            }

            // Build prompt for Gemini
            String prompt = summary.toString() +
                    "\nAs a friendly financial advisor, give me:\n" +
                    "1. 3-4 specific insights about my spending patterns\n" +
                    "2. Practical money saving tips with exact amounts in Rs\n" +
                    "3. One encouraging message at the end\n" +
                    "Be specific, friendly and use bullet points.\n" +
                    "Keep total response under 200 words.";

            log.info("Asking Gemini for spending insights for user: {}", userId);
            String insights = geminiClient.askGemini(prompt);

            // Handle rate limit
            if (insights.contains("Rate limit") || insights.contains("unavailable")) {
                return "AI insights unavailable right now. Please try again in 1 minute.";
            }

            return insights;

        } catch (Exception e) {
            log.error("Failed to get spending insights: {}", e.getMessage());
            return "Could not generate insights. Please try again later.";
        }
    }
}
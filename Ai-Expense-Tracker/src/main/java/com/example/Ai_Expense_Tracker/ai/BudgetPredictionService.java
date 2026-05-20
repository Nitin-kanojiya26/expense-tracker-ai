package com.example.Ai_Expense_Tracker.ai;

import com.example.Ai_Expense_Tracker.entity.Expense;
import com.example.Ai_Expense_Tracker.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BudgetPredictionService {

    private final GeminiClient geminiClient;
    private final ExpenseRepository expenseRepository;

    /**
     * Fetches last 3 months expenses
     * Sends monthly breakdown to Gemini
     * Returns AI predicted budget for next month
     */
    public String predictNextMonthBudget(Long userId) {
        try {
            //  Get last 3 months expenses
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusMonths(3);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            // Check if enough data exists
            if (expenses.size() < 5) {
                return "Not enough expense data to make a prediction. " +
                        "Please add at least 5 expenses over the last 3 months and try again!";
            }

            //  Group expenses by month
            Map<YearMonth, List<Expense>> byMonth = expenses.stream()
                    .collect(Collectors.groupingBy(
                            e -> YearMonth.from(e.getDate())
                    ));

            //  Build monthly summary for Gemini
            StringBuilder historySummary = new StringBuilder();
            historySummary.append("User's spending history for last 3 months:\n\n");

            byMonth.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> {
                        YearMonth month = entry.getKey();
                        List<Expense> monthExpenses = entry.getValue();

                        double monthTotal = monthExpenses.stream()
                                .mapToDouble(Expense::getAmount)
                                .sum();

                        historySummary.append("Month: ")
                                .append(month.format(DateTimeFormatter.ofPattern("MMMM yyyy")))
                                .append("\n");
                        historySummary.append("Total: Rs ")
                                .append(String.format("%.2f", monthTotal))
                                .append("\n");

                        // Category wise breakdown for this month
                        Map<String, Double> catWise = monthExpenses.stream()
                                .filter(e -> e.getCategory() != null)
                                .collect(Collectors.groupingBy(
                                        e -> e.getCategory().getName(),
                                        Collectors.summingDouble(Expense::getAmount)
                                ));

                        catWise.forEach((cat, amt) ->
                                historySummary.append("  - ")
                                        .append(cat)
                                        .append(": Rs ")
                                        .append(String.format("%.2f", amt))
                                        .append("\n"));

                        long uncategorized = monthExpenses.stream()
                                .filter(e -> e.getCategory() == null)
                                .count();
                        if (uncategorized > 0) {
                            historySummary.append("  - Uncategorized: ")
                                    .append(uncategorized)
                                    .append(" transactions\n");
                        }

                        historySummary.append("\n");
                    });

            //  Next month name
            String nextMonth = YearMonth.now()
                    .plusMonths(1)
                    .format(DateTimeFormatter.ofPattern("MMMM yyyy"));

            //  Ask Gemini to predict
            String prompt = historySummary.toString() +
                    "Based on this 3 month spending history, predict the budget for " + nextMonth + ".\n\n" +
                    "Format your response exactly like this:\n" +
                    "Budget Prediction for " + nextMonth + ":\n" +
                    "• [Category]: Rs [amount]\n" +
                    "• [Category]: Rs [amount]\n" +
                    "Total Predicted: Rs [total]\n\n" +
                    "Trend Analysis: [1-2 lines about spending trend]\n" +
                    "Top Tip: [one specific money saving tip with amount]\n\n" +
                    "Keep it concise and practical.";

            log.info("Predicting budget for user: {}", userId);
            String prediction = geminiClient.askGemini(prompt);

            // Handle rate limit
            if (prediction.contains("Rate limit") || prediction.contains("unavailable")) {
                return "AI is busy right now. Please wait 1 minute and try again.";
            }

            return prediction;

        } catch (Exception e) {
            log.error("Budget prediction failed: {}", e.getMessage());
            return "Could not generate budget prediction. Please try again later.";
        }
    }
}
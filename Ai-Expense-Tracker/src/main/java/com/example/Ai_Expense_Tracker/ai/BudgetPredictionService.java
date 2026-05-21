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
     * Compiles historical 3-month transaction matrices and feeds structured records
     * into Gemini with statistical weighting instructions for formula execution.
     */
    public String predictNextMonthBudget(Long userId) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusMonths(3);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            if (expenses.size() < 5) {
                return "ERROR: Shallow Ledger Base. Please register at least 5 baseline expenses across your historical 3-month cycle to build automated projections.";
            }

            Map<YearMonth, List<Expense>> byMonth = expenses.stream()
                    .collect(Collectors.groupingBy(
                            e -> YearMonth.from(e.getDate())
                    ));

            StringBuilder historySummary = new StringBuilder();
            historySummary.append("Historical spending telemetry metrics for user account rows:\n\n");

            byMonth.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> {
                        YearMonth month = entry.getKey();
                        List<Expense> monthExpenses = entry.getValue();

                        double monthTotal = monthExpenses.stream()
                                .mapToDouble(Expense::getAmount)
                                .sum();

                        historySummary.append("Target Timeline Cycle: ")
                                .append(month.format(DateTimeFormatter.ofPattern("MMMM yyyy")))
                                .append("\n");
                        historySummary.append("Aggregate Operational Value: Rs ")
                                .append(String.format("%.2f", monthTotal))
                                .append("\n");

                        Map<String, Double> catWise = monthExpenses.stream()
                                .filter(e -> e.getCategory() != null)
                                .collect(Collectors.groupingBy(
                                        e -> e.getCategory().getName(),
                                        Collectors.summingDouble(Expense::getAmount)
                                ));

                        catWise.forEach((cat, amt) ->
                                historySummary.append("  - Class Type [")
                                        .append(cat)
                                        .append("]: Rs ")
                                        .append(String.format("%.2f", amt))
                                        .append("\n"));

                        long uncategorized = monthExpenses.stream()
                                .filter(e -> e.getCategory() == null)
                                .count();
                        if (uncategorized > 0) {
                            historySummary.append("  - Dynamic Raw Log Entries: ")
                                    .append(uncategorized)
                                    .append(" units unmapped\n");
                        }

                        historySummary.append("\n");
                    });

            String nextMonth = YearMonth.now()
                    .plusMonths(1)
                    .format(DateTimeFormatter.ofPattern("MMMM yyyy"));

            // STATISTICALLY ENFORCED ARCHITECTURE PROMPT
            String prompt = historySummary.toString() +
                    "You are a financial backend statistical processor. You do not creatively estimate numbers.\n" +
                    "Task: Forecast the allocations for " + nextMonth + " using a strict 3-Month Weighted Moving Average mathematical formula.\n" +
                    "Apply these weights precisely across the monthly data provided above: 50% weight for the most recent month, 30% for the middle month, and 20% for the oldest month.\n\n" +

                    "Step 1: For each category, multiply its monthly totals by the assigned percentage weights and sum them to determine the exact forecast allocation.\n" +
                    "Step 2: Add all individual category calculations together to find the precise Total Predicted budget balance.\n\n" +

                    "You must format your final output sequence exactly like this template layout. Do not alter headings or mix conversational rows into the list block:\n" +
                    "Budget Prediction for " + nextMonth + ":\n" +
                    "• [Category Name]: Rs [Calculated Amount]\n" +
                    "• [Category Name]: Rs [Calculated Amount]\n" +
                    "Total Predicted: Rs [Sum of All Calculated Amounts]\n\n" +
                    "---\n\n" +
                    "AI Budget Insights:\n" +
                    "Trend Analysis: [Identify the single category with the highest mathematical upward slope and state its growth trend]\n" +
                    "Top Tip: [Provide 1 actionable optimization advisory sentence referencing a target reduction limit amount]\n\n" +
                    "Constraint: Keep raw lines separate. Do not wrap code snippets around the text output. Round all values to 2 decimal places.";

            log.info("Executing formulaic predictive routines for user account ID: {}", userId);
            String prediction = geminiClient.askGemini(prompt);

            if (prediction.contains("Rate limit") || prediction.contains("RESOURCE_EXHAUSTED") || prediction.contains("unavailable")) {
                return "ERROR: Server Gateway Latency. Machine learning compute engines are heavily loaded. Please re-trigger forecast routines in 60 seconds.";
            }

            return prediction;

        } catch (Exception e) {
            log.error("Core critical exception inside forecasting module: {}", e.getMessage());
            return "ERROR: Data compilation aborted unexpectedly. Check system structural logs.";
        }
    }
}
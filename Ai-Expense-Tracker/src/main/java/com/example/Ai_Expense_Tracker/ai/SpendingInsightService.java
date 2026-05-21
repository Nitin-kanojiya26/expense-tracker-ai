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
     * Aggregates trailing 30-day transactional metadata sets and runs optimization prompt arrays.
     */
    public String getSpendingInsights(Long userId) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(30);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            if (expenses.isEmpty()) {
                return "ERROR: Shallow Ledger Matrix. No registered expense metrics captured across the past 30-day tracking scope. Register historical log lines to deploy models.";
            }

            double total = expenses.stream()
                    .mapToDouble(Expense::getAmount)
                    .sum();

            Map<String, Double> categoryWise = expenses.stream()
                    .filter(e -> e.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            e -> e.getCategory().getName(),
                            Collectors.summingDouble(Expense::getAmount)
                    ));

            long uncategorized = expenses.stream()
                    .filter(e -> e.getCategory() == null)
                    .count();

            StringBuilder summary = new StringBuilder();
            summary.append("User transaction telemetry profile metadata for the previous trailing 30-day tracking window:\n");
            summary.append("Aggregate Outflow: Rs ").append(String.format("%.2f", total)).append("\n");
            summary.append("Transaction Row Density: ").append(expenses.size()).append(" rows\n");
            summary.append("Calculated Mean Velocity per Day: Rs ")
                    .append(String.format("%.2f", total / 30)).append("\n");

            if (!categoryWise.isEmpty()) {
                summary.append("\nDynamic Category Allocations Matrix:\n");
                categoryWise.forEach((category, amount) -> {
                    double percentage = (amount / total) * 100;
                    summary.append("- ").append(category)
                            .append(": Rs ").append(String.format("%.2f", amount))
                            .append(" (").append(String.format("%.1f", percentage)).append("%)\n");
                });
            }

            if (uncategorized > 0) {
                summary.append("- Unallocated Custom Items: ").append(uncategorized)
                        .append(" transaction metrics unmapped\n");
            }

            // RESTRUCTURED SYSTEM COMPLIANCE PROMPT CONTROLS
            String prompt = summary.toString() +
                    "\nYou are an elite automated financial advisory interface module. Review the ledger array summary telemetry listed above and construct exactly:\n" +
                    "1. 3 separate highly detailed analytical insights regarding historical spending patterns.\n" +
                    "2. 1 targeted optimization saving tip featuring precise currency reductions in Rs.\n" +
                    "3. 1 short positive execution encouragement message row.\n\n" +
                    "Architectural Formatting Rule: Provide your response strictly as simple single line items separated by standard newlines. Each line must be standalone. Do not insert conversational introductions, concluding headers, parenthetical numbering steps, or double asterisks (**). Keep total response count under 180 words.";

            log.info("Requesting targeted optimization audit matrix via Gemini endpoint for profile ID: {}", userId);
            String insights = geminiClient.askGemini(prompt);

            // STABILIZED GATEWAY LIMIT CHECK: Overwrite with unique error string prefix flags
            if (insights.contains("Rate limit") || insights.contains("RESOURCE_EXHAUSTED") || insights.contains("unavailable")) {
                return "ERROR: Server Gateway Latency. Machine learning compute engines are heavily loaded. Please re-trigger forecast routines in 60 seconds.";
            }

            return insights;

        } catch (Exception e) {
            log.error("Critical analytical interruption within insight module pipelines: {}", e.getMessage());
            return "ERROR: System compilation failure. Data logs aborted unexpectedly.";
        }
    }
}
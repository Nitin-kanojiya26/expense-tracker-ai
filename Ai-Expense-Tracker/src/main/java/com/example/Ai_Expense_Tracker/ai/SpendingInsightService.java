package com.example.Ai_Expense_Tracker.ai;

import com.example.Ai_Expense_Tracker.dto.InsightResponseDTO;
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

    public InsightResponseDTO getSpendingInsights(Long userId) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(30);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            if (expenses.isEmpty()) {
                return new InsightResponseDTO(
                        "You haven't added any expenses in the last 30 days yet! Go ahead and log a few purchases on your dashboard, and I'll jump right in to help you look over your habits.",
                        0.0, 0L, 0.0
                );
            }

            double total = expenses.stream()
                    .mapToDouble(Expense::getAmount)
                    .sum();

            long totalTransactions = expenses.size();
            double dailyAverage = total / 30.0;

            // Group transactions by category entity name
            Map<String, List<Expense>> groupedByCategory = expenses.stream()
                    .filter(e -> e.getCategory() != null)
                    .collect(Collectors.groupingBy(e -> e.getCategory().getName()));

            long uncategorized = expenses.stream()
                    .filter(e -> e.getCategory() == null)
                    .count();

            // Format data with deep transaction item context details
            StringBuilder rawDataFeed = new StringBuilder();
            rawDataFeed.append("Total money spent this month: Rs ").append(String.format("%.2f", total)).append("\n");
            rawDataFeed.append("Number of things bought: ").append(totalTransactions).append("\n");
            rawDataFeed.append("Average spending per day: Rs ").append(String.format("%.2f", dailyAverage)).append("\n");

            if (!groupedByCategory.isEmpty()) {
                rawDataFeed.append("\nDetailed breakdown by categories and items:\n");
                groupedByCategory.forEach((category, categoryExpenses) -> {
                    double categoryTotal = categoryExpenses.stream().mapToDouble(Expense::getAmount).sum();
                    double percentage = (categoryTotal / total) * 100;

                    rawDataFeed.append("- ").append(category)
                            .append(": Total Rs ").append(String.format("%.2f", categoryTotal))
                            .append(" (").append(String.format("%.1f", percentage)).append("%)\n");

                    // Extract transaction item specifics inside this category group
                    String itemDetails = categoryExpenses.stream()
                            .map(e -> String.format("'%s' costing Rs %.0f", e.getDescription(), e.getAmount()))
                            .distinct()
                            .limit(5) // Keep token layout light and short
                            .collect(Collectors.joining(", "));

                    rawDataFeed.append("  [Actual items logged here: ").append(itemDetails).append("]\n");
                });
            }

            if (uncategorized > 0) {
                rawDataFeed.append("- Items listed without any category: ").append(uncategorized).append("\n");
            }

            // ADVANCED SYSTEM PROMPT REWRITE: Strips out repetitive placeholder responses
            String prompt = rawDataFeed.toString() +
                    "\nTask: You are a friendly, encouraging personal finance companion talking directly to a real person. " +
                    "Look at their spending summary above along with the item names provided and give them exactly 5 short, separate thoughts.\n\n" +
                    "CRITICAL LANGUAGE RULES:\n" +
                    "1. Speak like a supportive, smart friend. Use warm terms like 'your monthly budget', 'shopping runs', 'groceries', or 'eating out'.\n" +
                    "2. NEVER use technical database or machine learning jargon. Absolutely ban terms like: 'telemetry', 'row density', 'metrics', 'matrix', 'outflow', 'unallocated elements', 'data profiles', or 'user rows'.\n" +
                    "3. ANTI-REPETITION MANDATE: Do NOT say things like 'your Other category went high' or 'explore your Other column'. Instead, read the actual text descriptions provided inside the square brackets for that category! Call out those real item names directly (e.g., 'Your annual gym registration' or 'Your high electricity bill' instead of saying 'Other').\n" +
                    "4. Structure your response exactly as 5 standalone sentences, each on a brand new line. Do not write any numbering (1.), bullet dashes (-), bold formatting (**), titles, or introductory greetings. Just plain, warm sentences.\n\n" +
                    "Line 1: An interesting, clear observation about where most of their money went this month by reading the actual item names inside the highest spending categories.\n" +
                    "Line 2: A second observation pointing out a specific item trend, luxury purchase, or a nice low spending category from their breakdown.\n" +
                    "Line 3: An observation about how often they spend or their uncategorized items if they exist.\n" +
                    "Line 4: A highly practical, simple tip to save cash next month based on their specific transaction descriptions with a concrete estimated saving value in Rs (e.g., 'Try skipping just a couple of takeaway coffees to save around Rs 400 next month!').\n" +
                    "Line 5: A short, high-energy sentence cheering them on for keeping track of their cash.";

            log.info("Requesting friendly human insight generation for user profile ID: {}", userId);
            String insights = geminiClient.askGemini(prompt);

            // Double check safety if Gemini encounters service issues or drops
            if (insights == null || insights.trim().isEmpty() || insights.contains("Rate limit") || insights.contains("RESOURCE_EXHAUSTED") || insights.contains("unavailable")) {
                return new InsightResponseDTO("Our system helper is running a bit slow right now. Let's try looking at your logs again in a minute!", total, totalTransactions, dailyAverage);
            }

            return new InsightResponseDTO(insights, total, totalTransactions, dailyAverage);

        } catch (Exception e) {
            log.error("Error generating friendly insights: {}", e.getMessage(), e);
            return new InsightResponseDTO("We hit a tiny roadblock reading your wallet data. Give it another try in a moment!", 0.0, 0L, 0.0);
        }
    }
}
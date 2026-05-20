package com.example.Ai_Expense_Tracker.ai;

import com.example.Ai_Expense_Tracker.entity.Expense;
import com.example.Ai_Expense_Tracker.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NaturalLanguageQueryService {

    private final GeminiClient geminiClient;
    private final ExpenseRepository expenseRepository;

    /**
     * User asks any question in plain English about their expenses
     * We fetch last 90 days data and send to Gemini with the question
     * Gemini answers based on real data
     */
    public String answerQuery(Long userId, String userQuestion) {
        try {
            // Get last 90 days expenses for context
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(90);
            List<Expense> expenses = expenseRepository
                    .findByUserIdAndDateBetween(userId, start, end);

            //  Check if user has expenses
            if (expenses.isEmpty()) {
                return "You have no expenses in the last 90 days. " +
                        "Start adding expenses first!";
            }

            //  Build expense data as readable text for Gemini
            StringBuilder expenseData = new StringBuilder();
            expenseData.append("User's expense data for last 90 days:\n");
            expenseData.append("Date | Description | Amount (Rs) | Category\n");
            expenseData.append("-----|-------------|-------------|--------\n");

            for (Expense e : expenses) {
                expenseData.append(e.getDate()).append(" | ")
                        .append(e.getDescription()).append(" | ")
                        .append("Rs ").append(e.getAmount()).append(" | ")
                        .append(e.getCategory() != null
                                ? e.getCategory().getName()
                                : "Uncategorized")
                        .append("\n");
            }

            // Step 4 - Add totals for context
            double total = expenses.stream()
                    .mapToDouble(Expense::getAmount)
                    .sum();
            expenseData.append("\nTotal spent in 90 days: Rs ")
                    .append(String.format("%.2f", total));
            expenseData.append("\nTotal transactions: ").append(expenses.size());

            // Step 5 - Build final prompt
            String prompt = expenseData.toString() +
                    "\n\nUser's question: " + userQuestion +
                    "\n\nInstructions:\n" +
                    "- Answer ONLY based on the expense data above\n" +
                    "- Be specific with amounts in Rs\n" +
                    "- Keep answer short and clear (max 3-4 lines)\n" +
                    "- If data is not available to answer, say so honestly\n" +
                    "Answer:";

            log.info("Processing query for user {}: {}", userId, userQuestion);
            String answer = geminiClient.askGemini(prompt);

            // Handle rate limit
            if (answer.contains("Rate limit") || answer.contains("unavailable")) {
                return "AI is busy right now. Please wait 1 minute and try again.";
            }

            return answer;

        } catch (Exception e) {
            log.error("Natural language query failed: {}", e.getMessage());
            return "Could not process your question. Please try again.";
        }
    }
}
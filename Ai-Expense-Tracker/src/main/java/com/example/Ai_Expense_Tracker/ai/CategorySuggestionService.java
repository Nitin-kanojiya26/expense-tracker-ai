package com.example.Ai_Expense_Tracker.ai;

import com.example.Ai_Expense_Tracker.entity.Category;
import com.example.Ai_Expense_Tracker.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategorySuggestionService {

    private final GeminiClient geminiClient;
    private final CategoryRepository categoryRepository;

    /**
     * Give expense description → AI returns best matching Category
     * Example: "bought pizza" → returns Category(name="Food & Dining")
     */
    public Category suggestCategory(String expenseDescription) {
        try {
            //  Get all categories from database
            List<Category> allCategories = categoryRepository.findAll();

            if (allCategories.isEmpty()) {
                log.warn("No categories found in database");
                return null;
            }

            //  Make a comma separated list of category names for Gemini
            String categoryList = allCategories.stream()
                    .map(Category::getName)
                    .collect(Collectors.joining(", "));

            //  Build a clear prompt for Gemini
            String prompt = "I have an expense with description: '" + expenseDescription + "'. " +
                    "Available categories are: " + categoryList + ". " +
                    "Which single category fits best? " +
                    "Reply with ONLY the category name exactly as written above. No explanation. No punctuation.";

            //  Ask Gemini
            String suggestedName = geminiClient.askGemini(prompt).trim();
            log.info("Gemini suggested category: '{}' for description: '{}'", suggestedName, expenseDescription);

            //  Find that category in database and return it
            return allCategories.stream()
                    .filter(c -> c.getName().equalsIgnoreCase(suggestedName))
                    .findFirst()
                    .orElseGet(() -> {
                        log.warn("Gemini suggested '{}' but not found in DB - assigning Other", suggestedName);
                        return allCategories.stream()
                                .filter(c -> c.getName().equalsIgnoreCase("Other"))
                                .findFirst()
                                .orElse(null);
                    });

        } catch (Exception e) {
            log.error("Category suggestion failed: {}", e.getMessage());
            return null;
        }
    }
}
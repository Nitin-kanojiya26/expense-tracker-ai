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
     * FULL FLOW:
     * 1. Ask Gemini to suggest best category name for expense
     * 2. Try to match with existing DB categories
     * 3. If match found → return that category
     * 4. If no match → create new custom category in DB → return it
     */
    public Category suggestCategory(String expenseDescription) {
        try {
            // Step 1 - Get all categories from DB
            List<Category> allCategories = categoryRepository.findAll();

            // Step 2 - Build category list for Gemini
            String categoryList = allCategories.stream()
                    .map(Category::getName)
                    .collect(Collectors.joining(", "));

            // Step 3 - Ask Gemini for best category name
            String prompt;
            if (!allCategories.isEmpty()) {
                prompt = "I have an expense: '" + expenseDescription + "'.\n" +
                        "Existing categories in my database: [" + categoryList + "].\n" +
                        "Rules:\n" +
                        "1. If any existing category fits well, return EXACTLY that name (same spelling)\n" +
                        "2. If no existing category fits, suggest a SHORT new category name (1-3 words)\n" +
                        "3. Reply with ONLY the category name. Nothing else. No explanation.\n" +
                        "Category:";
            } else {
                prompt = "I have an expense: '" + expenseDescription + "'.\n" +
                        "Suggest a SHORT category name (1-3 words) for this expense.\n" +
                        "Reply with ONLY the category name. Nothing else.\n" +
                        "Category:";
            }

            String suggestedName = geminiClient.askGemini(prompt).trim();
            System.out.println("GEMINI SUGGESTED: " + suggestedName);

            // If Gemini is unavailable or rate limited
            if (suggestedName.contains("Rate limit") ||
                    suggestedName.contains("unavailable") ||
                    suggestedName.contains("Error") ||
                    suggestedName.isEmpty()) {
                log.warn("Gemini unavailable - returning null");
                return null;
            }

            // Step 4 - Try EXACT match first
            Category exactMatch = allCategories.stream()
                    .filter(c -> c.getName().equalsIgnoreCase(suggestedName))
                    .findFirst()
                    .orElse(null);

            if (exactMatch != null) {
                System.out.println("EXACT MATCH FOUND: " + exactMatch.getName());
                return exactMatch;
            }

            // Step 5 - Try PARTIAL match
            // Example: Gemini returns "Food & Dining" but DB has "Food" → still matches!
            Category partialMatch = allCategories.stream()
                    .filter(c ->
                            suggestedName.toLowerCase().contains(c.getName().toLowerCase()) ||
                                    c.getName().toLowerCase().contains(suggestedName.toLowerCase())
                    )
                    .findFirst()
                    .orElse(null);

            if (partialMatch != null) {
                System.out.println("PARTIAL MATCH FOUND: " + partialMatch.getName());
                return partialMatch;
            }

            // Step 6 - No match found → Create NEW custom category in DB
            System.out.println("NO MATCH FOUND - Creating new category: " + suggestedName);
            log.info("Creating new custom category: {}", suggestedName);

            Category newCategory = new Category();
            newCategory.setName(suggestedName);
            Category saved = categoryRepository.save(newCategory);

            System.out.println("NEW CATEGORY CREATED WITH ID: " + saved.getId());
            return saved;

        } catch (Exception e) {
            log.error("Category suggestion failed: {}", e.getMessage());
            System.out.println("EXCEPTION: " + e.getMessage());
            return null;
        }
    }
}
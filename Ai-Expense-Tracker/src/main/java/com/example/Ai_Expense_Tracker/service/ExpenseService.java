package com.example.Ai_Expense_Tracker.service;


import com.example.Ai_Expense_Tracker.ai.CategorySuggestionService;
import com.example.Ai_Expense_Tracker.dto.ExpenseDTO;
import com.example.Ai_Expense_Tracker.dto.SummaryDTO;
import com.example.Ai_Expense_Tracker.entity.Category;
import com.example.Ai_Expense_Tracker.entity.Expense;
import com.example.Ai_Expense_Tracker.entity.User;
import com.example.Ai_Expense_Tracker.repository.CategoryRepository;
import com.example.Ai_Expense_Tracker.repository.ExpenseRepository;
import com.example.Ai_Expense_Tracker.repository.UserRepository;
import com.example.Ai_Expense_Tracker.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CategorySuggestionService categorySuggestionService;

    public ExpenseDTO addExpense(Long userId, Expense expense, Long categoryId) {
        User user = resolveUserForOperation(userId);
        expense.setUser(user);

        if (categoryId != null) {
            // User manually chose a category - use it directly
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found!"));
            expense.setCategory(category);
        } else {
            // No category chosen - ask AI to suggest one!
            log.info("No category provided, asking AI...");
            Category aiCategory = categorySuggestionService
                    .suggestCategory(expense.getDescription());
            if (aiCategory != null) {
                expense.setCategory(aiCategory);
                log.info("AI assigned category: {}", aiCategory.getName());
            }
        }

        if (expense.getDate() == null) {
            expense.setDate(LocalDate.now());
        }

        Expense saved = expenseRepository.save(expense);
        return convertToDTO(saved);
    }

    public List<ExpenseDTO> getUserExpenses(Long userId) {
        requireOwnerOrAdmin(userId);
        return expenseRepository.findByUserId(userId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public SummaryDTO getSummary(Long userId, LocalDate startDate, LocalDate endDate) {
        requireOwnerOrAdmin(userId);

        // 🔥 1. LAST 30 DAYS (for avgPer30Days)
        LocalDate end = LocalDate.now();
        LocalDate start30 = end.minusDays(29);

        List<Expense> last30DaysExpenses = expenseRepository
                .findByUserIdAndDateBetween(userId, start30, end);

        Double total30 = last30DaysExpenses.stream()
                .mapToDouble(Expense::getAmount)
                .sum();

        Double avgPer30Days = total30 / 30.0;

        // 🔥 2. FULL YEAR (Jan → Now) for monthlyAvg
        LocalDate yearStart = LocalDate.of(end.getYear(), 1, 1);

        List<Expense> yearExpenses = expenseRepository
                .findByUserIdAndDateBetween(userId, yearStart, end);

        // 🔹 Total (you can decide: year total OR 30-day total)
        Double total = yearExpenses.stream()
                .mapToDouble(Expense::getAmount)
                .sum();

        // 🔹 Category-wise (year based)
        Map<String, Double> categoryWise = yearExpenses.stream()
                .filter(e -> e.getCategory() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getCategory().getName(),
                        Collectors.summingDouble(Expense::getAmount)
                ));

        // 🔥 Monthly Avg (Jan → Now)
        Map<YearMonth, Double> monthlyTotal = yearExpenses.stream()
                .collect(Collectors.groupingBy(
                        e -> YearMonth.from(e.getDate()),
                        Collectors.summingDouble(Expense::getAmount)
                ));

        Map<String, Double> monthlyAvg = new LinkedHashMap<>();

        YearMonth startMonth = YearMonth.of(end.getYear(), 1); // Jan
        YearMonth currentMonth = YearMonth.from(end);

        while (!startMonth.isAfter(currentMonth)) {
            double monthTotal = monthlyTotal.getOrDefault(startMonth, 0.0);
            int daysInMonth = startMonth.lengthOfMonth();

            monthlyAvg.put(startMonth.toString(), monthTotal / daysInMonth);

            startMonth = startMonth.plusMonths(1);
        }

        return new SummaryDTO(
                total,
                categoryWise,
                (long) yearExpenses.size(),
                avgPer30Days,   // last 30 days
                monthlyAvg      // Jan → now
        );
    }
    public void deleteExpense(Long expenseId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found!"));
        requireOwnerOrAdmin(expense.getUser().getId());
        expenseRepository.delete(expense);
    }

    public ExpenseDTO updateExpense(Long expenseId, Expense updated, Long categoryId) {
        Expense existing = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found!"));
        requireOwnerOrAdmin(existing.getUser().getId());

        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        if (updated.getAmount() != null) {
            existing.setAmount(updated.getAmount());
        }
        if (updated.getDate() != null) {
            existing.setDate(updated.getDate());
        }
        if (updated.getNotes() != null) {
            existing.setNotes(updated.getNotes());
        }

        if (categoryId != null) {
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new RuntimeException("Category not found!"));
            requireCategoryAccess(category, existing.getUser());
            existing.setCategory(category);
        }

        Expense saved = expenseRepository.save(existing);
        return convertToDTO(saved);
    }

    private ExpenseDTO convertToDTO(Expense expense) {
        ExpenseDTO dto = new ExpenseDTO();
        dto.setId(expense.getId());
        dto.setDescription(expense.getDescription());
        dto.setAmount(expense.getAmount());
        dto.setDate(expense.getDate());
        dto.setNotes(expense.getNotes());
        if (expense.getCategory() != null) {
            dto.setCategoryName(expense.getCategory().getName());
        }
        return dto;
    }

    private User resolveUserForOperation(Long userId) {
        User current = getCurrentUser();
        if (SecurityUtil.hasRole("ROLE_ADMIN")) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found!"));
        }
        if (!current.getId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
        return current;
    }

    private void requireOwnerOrAdmin(Long userId) {
        if (SecurityUtil.hasRole("ROLE_ADMIN")) {
            return;
        }
        User current = getCurrentUser();
        if (!current.getId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private void requireCategoryAccess(Category category, User userContext) {
        if (SecurityUtil.hasRole("ROLE_ADMIN")) {
            return;
        }
        if (category.getUser() != null && !category.getUser().getId().equals(userContext.getId())) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private User getCurrentUser() {
        String username = SecurityUtil.currentUsername();
        if (username == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found!"));
    }
}

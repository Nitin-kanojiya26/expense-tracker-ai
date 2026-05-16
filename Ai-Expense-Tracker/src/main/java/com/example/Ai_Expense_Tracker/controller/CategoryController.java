package com.example.Ai_Expense_Tracker.controller;


import com.example.Ai_Expense_Tracker.entity.Category;
import com.example.Ai_Expense_Tracker.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;

    @PostMapping("/user/{userId}")
    public ResponseEntity<Category> createCategory(
            @PathVariable Long userId,
            @RequestBody Category category) {
        return new ResponseEntity<>(
                categoryService.createCategory(userId, category),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Category>> getUserCategories(@PathVariable Long userId) {
        return ResponseEntity.ok(categoryService.getUserCategories(userId));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<Category> updateCategory(
            @PathVariable Long categoryId,
            @RequestBody Category category) {
        return ResponseEntity.ok(categoryService.updateCategory(categoryId, category));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}

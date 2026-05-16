package com.example.Ai_Expense_Tracker.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.stringtemplate.v4.ST;

@Entity
@Data
@Table(name="categories")
@NoArgsConstructor
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message="Category name required")
    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne
    @JoinColumn(name="user_id")
    private User user;
}

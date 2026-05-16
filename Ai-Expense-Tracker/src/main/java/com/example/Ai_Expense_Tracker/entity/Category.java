package com.example.Ai_Expense_Tracker.entity;

import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import org.stringtemplate.v4.ST;

@Entity
@Table(name="categories")
@NoArgsConstructor
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne
    @JoinColumn(name="user_id")
    private User user;
}

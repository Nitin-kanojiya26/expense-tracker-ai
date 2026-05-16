package com.example.Ai_Expense_Tracker.entity;

import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import org.stringtemplate.v4.ST;

import java.time.LocalDate;

@Entity
@Table(name="expenses")
@NoArgsConstructor
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long Id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name="user_id",nullable = false)
    private User user;

    private String notes;
}

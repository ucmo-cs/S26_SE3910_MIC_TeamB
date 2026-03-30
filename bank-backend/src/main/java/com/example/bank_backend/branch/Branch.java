package com.example.bank_backend.branch;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String weekdayHours;

    @Column(nullable = false)
    private String saturdayHours;
}

package com.example.bank_backend.topic;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "topics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "topic_key", nullable = false, unique = true)
    private String key;

    @Column(nullable = false)
    private String name;

    private String description;
}

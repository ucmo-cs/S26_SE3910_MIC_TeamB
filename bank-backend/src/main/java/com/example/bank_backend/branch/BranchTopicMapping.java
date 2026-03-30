package com.example.bank_backend.branch;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branch_topics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchTopicMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long branchId;

    @Column(nullable = false)
    private Long topicId;
}

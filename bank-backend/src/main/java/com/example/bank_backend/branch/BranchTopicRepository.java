package com.example.bank_backend.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchTopicRepository extends JpaRepository<BranchTopicMapping, Long> {
    List<BranchTopicMapping> findByBranchId(Long branchId);
}

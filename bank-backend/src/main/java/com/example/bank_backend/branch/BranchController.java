package com.example.bank_backend.branch;

import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchRepository branchRepository;
    private final BranchTopicRepository branchTopicRepository;
    private final TopicRepository topicRepository;

    public BranchController(BranchRepository branchRepository,
                            BranchTopicRepository branchTopicRepository,
                            TopicRepository topicRepository) {
        this.branchRepository = branchRepository;
        this.branchTopicRepository = branchTopicRepository;
        this.topicRepository = topicRepository;
    }

    @GetMapping
    public List<Branch> getAllBranches() {
        return branchRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> getBranchById(@PathVariable Long id) {
        return branchRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/topics")
    public List<Topic> getBranchTopics(@PathVariable Long id) {
        List<Long> topicIds = branchTopicRepository.findByBranchId(id)
                .stream()
                .map(BranchTopicMapping::getTopicId)
                .toList();
        return topicRepository.findAllById(topicIds);
    }
}

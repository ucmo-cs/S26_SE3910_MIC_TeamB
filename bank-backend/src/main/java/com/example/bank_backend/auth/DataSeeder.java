package com.example.bank_backend.auth;

import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.branch.BranchTopicMapping;
import com.example.bank_backend.branch.BranchTopicRepository;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BranchRepository branchRepository;
    private final TopicRepository topicRepository;
    private final BranchTopicRepository branchTopicRepository;

    public DataSeeder(UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      BranchRepository branchRepository,
                      TopicRepository topicRepository,
                      BranchTopicRepository branchTopicRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.branchRepository = branchRepository;
        this.topicRepository = topicRepository;
        this.branchTopicRepository = branchTopicRepository;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedBranchesAndTopics();
    }

    private void seedUsers() {
        if (!userRepository.existsByEmail("test@bank.com")) {
            User testUser = User.builder()
                    .email("test@bank.com")
                    .password(passwordEncoder.encode("password123"))
                    .displayName("Test User")
                    .build();
            userRepository.save(testUser);
            System.out.println("Seeded test user: test@bank.com / password123");
        }

        if (!userRepository.existsByEmail("admin@bank.com")) {
            User admin = User.builder()
                    .email("admin@bank.com")
                    .password(passwordEncoder.encode("admin123"))
                    .displayName("Admin")
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            System.out.println("Seeded admin user: admin@bank.com / admin123");
        }
    }

    private void seedBranchesAndTopics() {
        if (branchRepository.count() > 0) {
            return;
        }

        // Read branch data from branches.json
        List<Branch> branches;
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream is = new ClassPathResource("branches.json").getInputStream();
            List<Map<String, Object>> branchDataList = mapper.readValue(is, new TypeReference<>() {});

            List<Branch> branchEntities = branchDataList.stream()
                    .map(data -> Branch.builder()
                            .name((String) data.get("name"))
                            .address((String) data.get("address"))
                            .weekdayHours((String) data.get("weekdayHours"))
                            .saturdayHours((String) data.get("saturdayHours"))
                            .build())
                    .toList();

            branches = branchRepository.saveAll(branchEntities);
        } catch (Exception e) {
            System.err.println("Failed to read branches.json: " + e.getMessage());
            return;
        }
        System.out.println("Seeded " + branches.size() + " branches");

        // Seed topics
        List<Topic> topics = topicRepository.saveAll(List.of(
                Topic.builder().key("checkingAccount").name("Checking Account").description("Open or manage a checking account").build(),
                Topic.builder().key("savingsAccount").name("Savings Account").description("Open or manage a savings account").build(),
                Topic.builder().key("cdsMoneyMarket").name("CDs & Money Market").description("Certificates of deposit and money market accounts").build(),
                Topic.builder().key("studentBanking").name("Student Banking").description("Banking services for students").build(),
                Topic.builder().key("autoLoans").name("Auto Loans").description("Vehicle financing options").build(),
                Topic.builder().key("homeEquity").name("Home Equity").description("Home equity loans and lines of credit").build(),
                Topic.builder().key("mortgage").name("Mortgage").description("Home mortgage services").build(),
                Topic.builder().key("studentLoans").name("Student Loans").description("Student loan options and refinancing").build(),
                Topic.builder().key("retirement").name("Retirement").description("Retirement planning and accounts").build(),
                Topic.builder().key("investmentAccount").name("Investment Account").description("Investment and brokerage accounts").build(),
                Topic.builder().key("creditCard").name("Credit Card").description("Credit card applications and services").build(),
                Topic.builder().key("other").name("Other").description("Other banking services").build()
        ));
        System.out.println("Seeded " + topics.size() + " topics");

        // Seed branch-topic mappings (all branches offer all topics)
        List<BranchTopicMapping> mappings = branches.stream()
                .flatMap(branch -> topics.stream()
                        .map(topic -> BranchTopicMapping.builder()
                                .branchId(branch.getId())
                                .topicId(topic.getId())
                                .build()))
                .toList();
        branchTopicRepository.saveAll(mappings);
        System.out.println("Seeded branch-topic mappings");
    }
}

package com.example.bank_backend.auth;

import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.branch.BranchTopicMapping;
import com.example.bank_backend.branch.BranchTopicRepository;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

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
    }

    private void seedBranchesAndTopics() {
        if (branchRepository.count() > 0) {
            return;
        }

        // Seed branches
        List<Branch> branches = branchRepository.saveAll(List.of(
                Branch.builder()
                        .name("Raytown")
                        .address("6705 Blue Ridge Blvd, Raytown, MO 64133")
                        .weekdayHours("8:30 AM – 5:30 PM")
                        .saturdayHours("Closed")
                        .build(),
                Branch.builder()
                        .name("Woods Chapel")
                        .address("750 NE Woods Chapel Rd, Lee's Summit, MO 64064")
                        .weekdayHours("8:30 AM – 5:30 PM")
                        .saturdayHours("Closed")
                        .build(),
                Branch.builder()
                        .name("Blue Hills")
                        .address("6100 Troost Ave, Kansas City, MO 64110")
                        .weekdayHours("8:30 AM – 5:30 PM")
                        .saturdayHours("Closed")
                        .build(),
                Branch.builder()
                        .name("Grandview")
                        .address("12829 U.S. 71 Frontage, Grandview, MO 64030")
                        .weekdayHours("8:30 AM – 5:30 PM")
                        .saturdayHours("Closed")
                        .build()
        ));
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
        for (Branch branch : branches) {
            for (Topic topic : topics) {
                branchTopicRepository.save(
                        BranchTopicMapping.builder()
                                .branchId(branch.getId())
                                .topicId(topic.getId())
                                .build()
                );
            }
        }
        System.out.println("Seeded branch-topic mappings");
    }
}

package com.example.bank_backend.analytics;

import com.example.bank_backend.appointment.Appointment;
import com.example.bank_backend.appointment.AppointmentRepository;
import com.example.bank_backend.appointment.AppointmentStatus;
import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int TOP_N = 5;

    private final AppointmentRepository appointmentRepository;
    private final BranchRepository branchRepository;
    private final TopicRepository topicRepository;

    public AnalyticsSummaryResponse summary() {
        List<Appointment> all = appointmentRepository.findAll();

        Map<Long, String> branchNames = branchRepository.findAll().stream()
                .collect(Collectors.toMap(Branch::getId, Branch::getName));
        Map<Long, String> topicNames = topicRepository.findAll().stream()
                .collect(Collectors.toMap(Topic::getId, Topic::getName));

        long total = all.size();
        double noShowRate = computeNoShowRate(all);
        List<TopicCount> topTopics = computeTopTopics(all, topicNames);
        List<BranchCount> busiestBranches = computeBusiestBranches(all, branchNames);
        List<HourCount> peakHours = computePeakHours(all);

        return new AnalyticsSummaryResponse(total, noShowRate, topTopics, busiestBranches, peakHours);
    }

    private double computeNoShowRate(List<Appointment> all) {
        long noShow = all.stream().filter(a -> a.getStatus() == AppointmentStatus.NO_SHOW).count();
        long completed = all.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long arrived = all.stream().filter(a -> a.getStatus() == AppointmentStatus.ARRIVED).count();
        long denominator = noShow + completed + arrived;
        if (denominator == 0) {
            return 0.0;
        }
        double raw = (double) noShow / denominator;
        return Math.round(raw * 10000d) / 10000d;
    }

    private List<TopicCount> computeTopTopics(List<Appointment> all, Map<Long, String> topicNames) {
        Map<Long, Long> grouped = all.stream()
                .collect(Collectors.groupingBy(Appointment::getTopicId, Collectors.counting()));
        return grouped.entrySet().stream()
                .map(e -> new TopicCount(
                        topicNames.getOrDefault(e.getKey(), "Topic #" + e.getKey()),
                        e.getValue()))
                .sorted(Comparator.comparingLong(TopicCount::count).reversed())
                .limit(TOP_N)
                .toList();
    }

    private List<BranchCount> computeBusiestBranches(List<Appointment> all, Map<Long, String> branchNames) {
        Map<Long, Long> grouped = all.stream()
                .collect(Collectors.groupingBy(Appointment::getBranchId, Collectors.counting()));
        return grouped.entrySet().stream()
                .map(e -> new BranchCount(
                        branchNames.getOrDefault(e.getKey(), "Branch #" + e.getKey()),
                        e.getValue()))
                .sorted(Comparator.comparingLong(BranchCount::count).reversed())
                .limit(TOP_N)
                .toList();
    }

    private List<HourCount> computePeakHours(List<Appointment> all) {
        Map<Integer, Long> grouped = new HashMap<>();
        for (Appointment a : all) {
            if (a.getStatus() == AppointmentStatus.CANCELLED) {
                continue;
            }
            int hour = a.getAppointmentDateTime().getHour();
            grouped.merge(hour, 1L, Long::sum);
        }
        return grouped.entrySet().stream()
                .map(e -> new HourCount(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingInt(HourCount::hour))
                .toList();
    }
}

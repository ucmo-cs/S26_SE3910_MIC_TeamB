package com.example.bank_backend.analytics;

import java.util.List;

public record AnalyticsSummaryResponse(
        long totalAppointments,
        double noShowRate,
        List<TopicCount> topTopics,
        List<BranchCount> busiestBranches,
        List<HourCount> peakHours
) {
}

package com.example.bank_backend.analytics;

import com.example.bank_backend.appointment.Appointment;
import com.example.bank_backend.appointment.AppointmentRepository;
import com.example.bank_backend.appointment.AppointmentStatus;
import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private TopicRepository topicRepository;

    @InjectMocks
    private AnalyticsService service;

    private final List<Branch> branches = List.of(
            Branch.builder().id(1L).name("Downtown").address("a").weekdayHours("h").saturdayHours("h").build(),
            Branch.builder().id(2L).name("Uptown").address("a").weekdayHours("h").saturdayHours("h").build()
    );
    private final List<Topic> topics = List.of(
            Topic.builder().id(10L).key("checking").name("Checking Account").build(),
            Topic.builder().id(20L).key("mortgage").name("Mortgage").build()
    );

    @BeforeEach
    void setUp() {
        when(branchRepository.findAll()).thenReturn(branches);
        when(topicRepository.findAll()).thenReturn(topics);
    }

    private Appointment appt(Long id, Long branchId, Long topicId, AppointmentStatus status, int hour) {
        return Appointment.builder()
                .id(id)
                .customerName("X")
                .customerEmail("x@example.com")
                .branchId(branchId)
                .topicId(topicId)
                .status(status)
                .appointmentDateTime(LocalDateTime.of(2026, 5, 10, hour, 0))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void summary_zeroState_returnsZeroes() {
        when(appointmentRepository.findAll()).thenReturn(List.of());

        AnalyticsSummaryResponse response = service.summary();

        assertThat(response.totalAppointments()).isZero();
        assertThat(response.noShowRate()).isZero();
        assertThat(response.topTopics()).isEmpty();
        assertThat(response.busiestBranches()).isEmpty();
        assertThat(response.peakHours()).isEmpty();
    }

    @Test
    void summary_computesNoShowRateExcludingCancelledAndScheduled() {
        when(appointmentRepository.findAll()).thenReturn(List.of(
                appt(1L, 1L, 10L, AppointmentStatus.NO_SHOW, 10),
                appt(2L, 1L, 10L, AppointmentStatus.COMPLETED, 11),
                appt(3L, 1L, 10L, AppointmentStatus.COMPLETED, 12),
                appt(4L, 1L, 10L, AppointmentStatus.CANCELLED, 13),
                appt(5L, 1L, 10L, AppointmentStatus.SCHEDULED, 14)
        ));

        AnalyticsSummaryResponse response = service.summary();

        assertThat(response.totalAppointments()).isEqualTo(5);
        assertThat(response.noShowRate()).isEqualTo(1.0 / 3.0,
                org.assertj.core.api.Assertions.within(0.0001));
    }

    @Test
    void summary_topTopicsSortedDescAndCappedAt5() {
        List<Appointment> appts = new ArrayList<>();
        long id = 1L;
        long[] topicIds = {10L, 10L, 10L, 20L, 20L};
        for (long topicId : topicIds) {
            appts.add(appt(id++, 1L, topicId, AppointmentStatus.SCHEDULED, 10));
        }
        when(appointmentRepository.findAll()).thenReturn(appts);

        AnalyticsSummaryResponse response = service.summary();

        assertThat(response.topTopics()).hasSize(2);
        assertThat(response.topTopics().get(0).topic()).isEqualTo("Checking Account");
        assertThat(response.topTopics().get(0).count()).isEqualTo(3);
        assertThat(response.topTopics().get(1).topic()).isEqualTo("Mortgage");
        assertThat(response.topTopics().get(1).count()).isEqualTo(2);
    }

    @Test
    void summary_busiestBranchesUsesBranchNames() {
        when(appointmentRepository.findAll()).thenReturn(List.of(
                appt(1L, 2L, 10L, AppointmentStatus.SCHEDULED, 10),
                appt(2L, 2L, 10L, AppointmentStatus.SCHEDULED, 11),
                appt(3L, 1L, 10L, AppointmentStatus.SCHEDULED, 12)
        ));

        AnalyticsSummaryResponse response = service.summary();

        assertThat(response.busiestBranches()).hasSize(2);
        assertThat(response.busiestBranches().get(0).branch()).isEqualTo("Uptown");
        assertThat(response.busiestBranches().get(0).count()).isEqualTo(2);
        assertThat(response.busiestBranches().get(1).branch()).isEqualTo("Downtown");
    }

    @Test
    void summary_peakHoursGroupedByHourOfDay_excludingCancelled() {
        when(appointmentRepository.findAll()).thenReturn(List.of(
                appt(1L, 1L, 10L, AppointmentStatus.SCHEDULED, 9),
                appt(2L, 1L, 10L, AppointmentStatus.COMPLETED, 9),
                appt(3L, 1L, 10L, AppointmentStatus.CANCELLED, 9),
                appt(4L, 1L, 10L, AppointmentStatus.SCHEDULED, 14)
        ));

        AnalyticsSummaryResponse response = service.summary();

        assertThat(response.peakHours()).hasSize(2);
        assertThat(response.peakHours().get(0).hour()).isEqualTo(9);
        assertThat(response.peakHours().get(0).count()).isEqualTo(2);
        assertThat(response.peakHours().get(1).hour()).isEqualTo(14);
        assertThat(response.peakHours().get(1).count()).isEqualTo(1);
    }
}

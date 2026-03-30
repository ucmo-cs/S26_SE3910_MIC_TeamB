package com.example.bank_backend.appointment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AppointmentRepositoryTest {

    @Autowired
    private AppointmentRepository repository;

    private final LocalDateTime base = LocalDateTime.of(2026, 4, 15, 10, 0);

    @BeforeEach
    void setUp() {
        repository.deleteAll();

        repository.save(Appointment.builder()
                .customerName("Alice Smith")
                .customerEmail("alice@example.com")
                .branchId(1L)
                .topicId(1L)
                .appointmentDateTime(base)
                .status(AppointmentStatus.SCHEDULED)
                .build());

        repository.save(Appointment.builder()
                .customerName("Bob Jones")
                .customerEmail("bob@example.com")
                .branchId(1L)
                .topicId(2L)
                .appointmentDateTime(base.plusHours(1))
                .status(AppointmentStatus.CANCELLED)
                .build());

        repository.save(Appointment.builder()
                .customerName("Carol White")
                .customerEmail("carol@example.com")
                .branchId(2L)
                .topicId(1L)
                .appointmentDateTime(base.plusDays(1))
                .status(AppointmentStatus.COMPLETED)
                .build());
    }

    @Test
    void findByBranchId_returnsAppointmentsForThatBranch() {
        List<Appointment> results = repository.findByBranchId(1L);

        assertThat(results).hasSize(2);
        assertThat(results).allMatch(a -> a.getBranchId().equals(1L));
    }

    @Test
    void findByBranchId_returnsEmptyWhenNoneMatch() {
        List<Appointment> results = repository.findByBranchId(999L);

        assertThat(results).isEmpty();
    }

    @Test
    void findByCustomerEmail_returnsCorrectAppointment() {
        List<Appointment> results = repository.findByCustomerEmail("alice@example.com");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCustomerName()).isEqualTo("Alice Smith");
    }

    @Test
    void findByStatus_scheduledReturnsOneRecord() {
        List<Appointment> results = repository.findByStatus(AppointmentStatus.SCHEDULED);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCustomerEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void findByStatus_cancelledReturnsOneRecord() {
        List<Appointment> results = repository.findByStatus(AppointmentStatus.CANCELLED);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCustomerEmail()).isEqualTo("bob@example.com");
    }

    @Test
    void findByAppointmentDateTimeBetween_returnsOnlyAppointmentsInRange() {
        // Range covers base and base+1h but NOT base+1day
        List<Appointment> results = repository.findByAppointmentDateTimeBetween(
                base.minusMinutes(1), base.plusHours(2));

        assertThat(results).hasSize(2);
        assertThat(results).noneMatch(a -> a.getCustomerEmail().equals("carol@example.com"));
    }

    @Test
    void findByAppointmentDateTimeBetween_returnsEmptyWhenOutOfRange() {
        List<Appointment> results = repository.findByAppointmentDateTimeBetween(
                base.plusYears(1), base.plusYears(2));

        assertThat(results).isEmpty();
    }
}

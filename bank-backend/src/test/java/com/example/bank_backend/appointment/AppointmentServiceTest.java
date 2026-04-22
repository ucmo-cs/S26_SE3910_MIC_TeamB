package com.example.bank_backend.appointment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository repository;

    @InjectMocks
    private AppointmentService service;

    private final LocalDateTime appointmentTime = LocalDateTime.of(2026, 4, 15, 10, 0);
    private final LocalDateTime createdTime = LocalDateTime.of(2026, 3, 1, 9, 0);

    private Appointment buildAppointment(Long id, AppointmentStatus status) {
        return Appointment.builder()
                .id(id)
                .customerName("Jane Doe")
                .customerEmail("jane@example.com")
                .branchId(1L)
                .topicId(2L)
                .appointmentDateTime(appointmentTime)
                .status(status)
                .notes("First visit")
                .createdAt(createdTime)
                .build();
    }

    private AppointmentDTO buildDTO() {
        return AppointmentDTO.builder()
                .customerName("Jane Doe")
                .customerEmail("jane@example.com")
                .branchId(1L)
                .topicId(2L)
                .appointmentDateTime(appointmentTime)
                .notes("First visit")
                .build();
    }

    // -------------------------------------------------------------------------
    // bookAppointment
    // -------------------------------------------------------------------------

    @Test
    void bookAppointment_savesAndReturnsDTO() {
        Appointment saved = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.existsByBranchIdAndAppointmentDateTimeAndStatus(
                1L, appointmentTime, AppointmentStatus.SCHEDULED)).thenReturn(false);
        when(repository.save(any(Appointment.class))).thenReturn(saved);

        AppointmentDTO result = service.bookAppointment(buildDTO());

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCustomerName()).isEqualTo("Jane Doe");
        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
        verify(repository, times(1)).save(any(Appointment.class));
    }

    @Test
    void bookAppointment_throwsDuplicateBooking_whenSlotAlreadyTaken() {
        when(repository.existsByBranchIdAndAppointmentDateTimeAndStatus(
                1L, appointmentTime, AppointmentStatus.SCHEDULED)).thenReturn(true);

        assertThatThrownBy(() -> service.bookAppointment(buildDTO()))
                .isInstanceOf(DuplicateBookingException.class)
                .hasMessageContaining("already booked");

        verify(repository, never()).save(any(Appointment.class));
    }

    // -------------------------------------------------------------------------
    // getAppointmentById
    // -------------------------------------------------------------------------

    @Test
    void getAppointmentById_returnsDTO_whenFound() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));

        AppointmentDTO result = service.getAppointmentById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCustomerEmail()).isEqualTo("jane@example.com");
    }

    @Test
    void getAppointmentById_throwsNotFound_whenMissing() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getAppointmentById(99L))
                .isInstanceOf(AppointmentNotFoundException.class)
                .hasMessageContaining("99");
    }

    // -------------------------------------------------------------------------
    // getAllAppointments
    // -------------------------------------------------------------------------

    @Test
    void getAllAppointments_returnsListOfDTOs() {
        when(repository.findAll()).thenReturn(List.of(
                buildAppointment(1L, AppointmentStatus.SCHEDULED),
                buildAppointment(2L, AppointmentStatus.COMPLETED)
        ));

        List<AppointmentDTO> results = service.getAllAppointments();

        assertThat(results).hasSize(2);
    }

    @Test
    void getAllAppointments_returnsEmptyList_whenNone() {
        when(repository.findAll()).thenReturn(List.of());

        List<AppointmentDTO> results = service.getAllAppointments();

        assertThat(results).isEmpty();
    }

    // -------------------------------------------------------------------------
    // getAppointmentsByBranch
    // -------------------------------------------------------------------------

    @Test
    void getAppointmentsByBranch_delegatesToRepo() {
        when(repository.findByBranchId(1L)).thenReturn(List.of(buildAppointment(1L, AppointmentStatus.SCHEDULED)));

        List<AppointmentDTO> results = service.getAppointmentsByBranch(1L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getBranchId()).isEqualTo(1L);
    }

    // -------------------------------------------------------------------------
    // getAppointmentsByEmail
    // -------------------------------------------------------------------------

    @Test
    void getAppointmentsByEmail_delegatesToRepo() {
        when(repository.findByCustomerEmail("jane@example.com"))
                .thenReturn(List.of(buildAppointment(1L, AppointmentStatus.SCHEDULED)));

        List<AppointmentDTO> results = service.getAppointmentsByEmail("jane@example.com");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCustomerEmail()).isEqualTo("jane@example.com");
    }

    // -------------------------------------------------------------------------
    // getAppointmentsByDateRange
    // -------------------------------------------------------------------------

    @Test
    void getAppointmentsByDateRange_delegatesToRepo() {
        LocalDateTime start = appointmentTime.minusDays(1);
        LocalDateTime end = appointmentTime.plusDays(1);
        when(repository.findByAppointmentDateTimeBetween(start, end))
                .thenReturn(List.of(buildAppointment(1L, AppointmentStatus.SCHEDULED)));

        List<AppointmentDTO> results = service.getAppointmentsByDateRange(start, end);

        assertThat(results).hasSize(1);
    }

    // -------------------------------------------------------------------------
    // cancelAppointment
    // -------------------------------------------------------------------------

    @Test
    void cancelAppointment_setsStatusToCancelled() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.cancelAppointment(1L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
    }

    @Test
    void cancelAppointment_throwsNotFound_whenMissing() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelAppointment(99L))
                .isInstanceOf(AppointmentNotFoundException.class);
    }

    // -------------------------------------------------------------------------
    // rescheduleAppointment
    // -------------------------------------------------------------------------

    @Test
    void rescheduleAppointment_updatesDateTimeAndKeepsScheduled() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        LocalDateTime newTime = appointmentTime.plusDays(3);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.rescheduleAppointment(1L, newTime);

        assertThat(result.getAppointmentDateTime()).isEqualTo(newTime);
        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.SCHEDULED);
    }

    @Test
    void rescheduleAppointment_throwsNotFound_whenMissing() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rescheduleAppointment(99L, appointmentTime))
                .isInstanceOf(AppointmentNotFoundException.class);
    }

    // -------------------------------------------------------------------------
    // completeAppointment
    // -------------------------------------------------------------------------

    @Test
    void completeAppointment_setsStatusToCompleted() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.completeAppointment(1L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
    }

    @Test
    void completeAppointment_throwsNotFound_whenMissing() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeAppointment(99L))
                .isInstanceOf(AppointmentNotFoundException.class);
    }
}

package com.example.bank_backend.appointment;

import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.email.EmailService;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
//import org.mockito.junit.MockitoSettings;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
//@MockitoSettings(strictness = Strictness.LENIENT)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository repository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private TopicRepository topicRepository;

    @Mock
    private EmailService emailService;

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

    @BeforeEach
    void seedCommonStubs() {
        when(branchRepository.existsById(anyLong())).thenReturn(true);
        when(branchRepository.findById(anyLong())).thenReturn(Optional.of(
                Branch.builder()
                        .id(1L)
                        .name("Test Branch")
                        .address("123 Main St")
                        .weekdayHours("9-5")
                        .build()));
        when(topicRepository.findById(anyLong())).thenReturn(Optional.of(
                Topic.builder()
                        .id(2L)
                        .name("Test Topic")
                        .build()));
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
    void bookAppointment_persistsNotes() {
        AppointmentDTO dto = buildDTO();
        dto.setNotes("Bring two forms of ID");
        when(repository.existsByBranchIdAndAppointmentDateTimeAndStatus(
                1L, appointmentTime, AppointmentStatus.SCHEDULED)).thenReturn(false);
        org.mockito.ArgumentCaptor<Appointment> captor =
                org.mockito.ArgumentCaptor.forClass(Appointment.class);
        when(repository.save(captor.capture())).thenAnswer(inv -> {
            Appointment a = inv.getArgument(0);
            a.setId(99L);
            return a;
        });

        AppointmentDTO result = service.bookAppointment(dto);

        assertThat(captor.getValue().getNotes()).isEqualTo("Bring two forms of ID");
        assertThat(result.getNotes()).isEqualTo("Bring two forms of ID");
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

    // -------------------------------------------------------------------------
    // markArrived / markNoShow / transition rules
    // -------------------------------------------------------------------------

    @Test
    void markArrived_succeeds_fromScheduled() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.markArrived(1L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.ARRIVED);
    }

    @Test
    void markArrived_throws_fromCancelled() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.CANCELLED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> service.markArrived(1L))
                .isInstanceOf(InvalidStatusTransitionException.class);
        verify(repository, never()).save(any(Appointment.class));
    }

    @Test
    void markArrived_throwsNotFound_whenMissing() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markArrived(99L))
                .isInstanceOf(AppointmentNotFoundException.class);
    }

    @Test
    void markNoShow_succeeds_fromScheduled() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.markNoShow(1L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.NO_SHOW);
    }

    @Test
    void markNoShow_throws_fromArrived() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.ARRIVED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> service.markNoShow(1L))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void completeAppointment_succeeds_fromArrived() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.ARRIVED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDTO result = service.completeAppointment(1L);

        assertThat(result.getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
    }

    @Test
    void cancelAppointment_throws_fromCompleted() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.COMPLETED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> service.cancelAppointment(1L))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void rescheduleAppointment_throws_fromArrived() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.ARRIVED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> service.rescheduleAppointment(1L, appointmentTime.plusDays(1)))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    // -------------------------------------------------------------------------
    // Email triggers on cancel / reschedule
    // -------------------------------------------------------------------------

    @Test
    void cancelAppointment_sendsCancellationEmail() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        service.cancelAppointment(1L);

        verify(emailService, times(1)).sendCancellation(
                eq("jane@example.com"),
                eq("Jane Doe"),
                eq(appointmentTime),
                eq("Test Branch"),
                eq("Test Topic"));
    }

    @Test
    void rescheduleAppointment_sendsUpdatedConfirmationEmail() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        LocalDateTime newTime = appointmentTime.plusDays(2);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        service.rescheduleAppointment(1L, newTime);

        verify(emailService, times(1)).sendRescheduleConfirmation(
                eq("jane@example.com"),
                eq("Jane Doe"),
                eq(appointmentTime),
                eq(newTime),
                eq("Test Branch"),
                eq("123 Main St"),
                eq("9-5"),
                eq("Test Topic"));
    }

    @Test
    void rescheduleAppointment_resetsReminderFlags() {
        Appointment appt = buildAppointment(1L, AppointmentStatus.SCHEDULED);
        appt.setReminder24hSent(true);
        appt.setReminder1hSent(true);
        when(repository.findById(1L)).thenReturn(Optional.of(appt));
        when(repository.save(appt)).thenAnswer(inv -> inv.getArgument(0));

        service.rescheduleAppointment(1L, appointmentTime.plusDays(1));

        assertThat(appt.isReminder24hSent()).isFalse();
        assertThat(appt.isReminder1hSent()).isFalse();
    }

    // -------------------------------------------------------------------------
    // sendDueReminders
    // -------------------------------------------------------------------------

    @Test
    void sendDueReminders_skipsAppointmentsAlreadyReminded() {
        when(repository.findByStatusAndAppointmentDateTimeBetweenAndReminder24hSentFalse(
                eq(AppointmentStatus.SCHEDULED), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(repository.findByStatusAndAppointmentDateTimeBetweenAndReminder1hSentFalse(
                eq(AppointmentStatus.SCHEDULED), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());

        ReminderDispatchResult result = service.sendDueReminders();

        assertThat(result.sent24h()).isZero();
        assertThat(result.sent1h()).isZero();
        verify(emailService, never()).sendReminder(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void sendDueReminders_sendsAndMarksFlags() {
        Appointment a24 = buildAppointment(10L, AppointmentStatus.SCHEDULED);
        Appointment a1 = buildAppointment(11L, AppointmentStatus.SCHEDULED);

        when(repository.findByStatusAndAppointmentDateTimeBetweenAndReminder24hSentFalse(
                eq(AppointmentStatus.SCHEDULED), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(a24));
        when(repository.findByStatusAndAppointmentDateTimeBetweenAndReminder1hSentFalse(
                eq(AppointmentStatus.SCHEDULED), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(a1));
        when(repository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        ReminderDispatchResult result = service.sendDueReminders();

        assertThat(result.sent24h()).isEqualTo(1);
        assertThat(result.sent1h()).isEqualTo(1);
        assertThat(a24.isReminder24hSent()).isTrue();
        assertThat(a1.isReminder1hSent()).isTrue();
        verify(emailService, times(1)).sendReminder(
                eq("jane@example.com"), eq("Jane Doe"), any(LocalDateTime.class),
                eq("Test Branch"), eq("123 Main St"), eq("Test Topic"), eq("tomorrow"));
        verify(emailService, times(1)).sendReminder(
                eq("jane@example.com"), eq("Jane Doe"), any(LocalDateTime.class),
                eq("Test Branch"), eq("123 Main St"), eq("Test Topic"), eq("in 1 hour"));
    }
}

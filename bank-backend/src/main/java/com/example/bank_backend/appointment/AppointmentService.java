package com.example.bank_backend.appointment;

import com.example.bank_backend.branch.Branch;
import com.example.bank_backend.branch.BranchRepository;
import com.example.bank_backend.email.EmailService;
import com.example.bank_backend.topic.Topic;
import com.example.bank_backend.topic.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final BranchRepository branchRepository;
    private final TopicRepository topicRepository;
    private final EmailService emailService;

    // -------------------------------------------------------------------------
    // Mapping helpers
    // -------------------------------------------------------------------------

    private AppointmentDTO toDTO(Appointment appointment) {
        return AppointmentDTO.builder()
                .id(appointment.getId())
                .customerName(appointment.getCustomerName())
                .customerEmail(appointment.getCustomerEmail())
                .branchId(appointment.getBranchId())
                .topicId(appointment.getTopicId())
                .appointmentDateTime(appointment.getAppointmentDateTime())
                .status(appointment.getStatus())
                .notes(appointment.getNotes())
                .createdAt(appointment.getCreatedAt())
                .build();
    }

    private Appointment toEntity(AppointmentDTO dto) {
        return Appointment.builder()
                .customerName(dto.getCustomerName())
                .customerEmail(dto.getCustomerEmail())
                .branchId(dto.getBranchId())
                .topicId(dto.getTopicId())
                .appointmentDateTime(dto.getAppointmentDateTime())
                .status(dto.getStatus() != null ? dto.getStatus() : AppointmentStatus.SCHEDULED)
                .notes(dto.getNotes())
                .build();
    }

    // -------------------------------------------------------------------------
    // CRUD operations
    // -------------------------------------------------------------------------

    private void validateBranchExists(Long branchId) {
        if (!branchRepository.existsById(branchId)) {
            throw new IllegalArgumentException("Branch not found with ID: " + branchId);
        }
    }

    private void validateBusinessHours(LocalDateTime dateTime) {
        DayOfWeek day = dateTime.getDayOfWeek();
        int hour = dateTime.getHour();
        int minute = dateTime.getMinute();

        if (day == DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException("Appointments are not available on Sundays");
        }
        if (minute != 0 && minute != 30) {
            throw new IllegalArgumentException("Appointments must start on a 30-minute boundary (e.g., 09:00, 09:30, 10:00)");
        }
        int endHour = (day == DayOfWeek.SATURDAY) ? 13 : 17;
        if (hour < 9 || hour >= endHour) {
            String hours = (day == DayOfWeek.SATURDAY) ? "9:00 AM – 1:00 PM" : "9:00 AM – 5:00 PM";
            throw new IllegalArgumentException("Appointment time must be within business hours: " + hours);
        }
    }

    @Transactional
    public AppointmentDTO bookAppointment(AppointmentDTO dto) {
        validateBranchExists(dto.getBranchId());
        validateBusinessHours(dto.getAppointmentDateTime());

        // Prevent double-booking: same branch + same time slot
        boolean alreadyBooked = appointmentRepository
                .existsByBranchIdAndAppointmentDateTimeAndStatus(
                        dto.getBranchId(),
                        dto.getAppointmentDateTime(),
                        AppointmentStatus.SCHEDULED);
        if (alreadyBooked) {
            throw new DuplicateBookingException(dto.getBranchId(), dto.getAppointmentDateTime());
        }

        Appointment saved = appointmentRepository.save(toEntity(dto));

        branchRepository.findById(dto.getBranchId()).ifPresent(branch ->
                topicRepository.findById(dto.getTopicId()).ifPresent(topic ->
                        emailService.sendBookingConfirmation(
                                saved.getCustomerEmail(),
                                saved.getCustomerName(),
                                saved.getAppointmentDateTime(),
                                branch.getName(),
                                branch.getAddress(),
                                branch.getWeekdayHours(),
                                topic.getName()
                        )
                )
        );

        return toDTO(saved);
    }

    public AppointmentDTO getAppointmentById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        return toDTO(appointment);
    }

    public List<AppointmentDTO> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Filtering queries
    // -------------------------------------------------------------------------

    public List<AppointmentDTO> getAppointmentsByBranch(Long branchId) {
        return appointmentRepository.findByBranchId(branchId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<AppointmentDTO> getAppointmentsByEmail(String email) {
        return appointmentRepository.findByCustomerEmail(email)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<AppointmentDTO> getAppointmentsByDateRange(LocalDateTime start, LocalDateTime end) {
        return appointmentRepository.findByAppointmentDateTimeBetween(start, end)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Status transitions
    // -------------------------------------------------------------------------

    private static final Map<AppointmentStatus, Set<AppointmentStatus>> ALLOWED_TRANSITIONS = Map.of(
            AppointmentStatus.SCHEDULED, EnumSet.of(
                    AppointmentStatus.ARRIVED,
                    AppointmentStatus.CANCELLED,
                    AppointmentStatus.COMPLETED,
                    AppointmentStatus.NO_SHOW),
            AppointmentStatus.ARRIVED, EnumSet.of(
                    AppointmentStatus.COMPLETED,
                    AppointmentStatus.CANCELLED),
            AppointmentStatus.COMPLETED, EnumSet.noneOf(AppointmentStatus.class),
            AppointmentStatus.CANCELLED, EnumSet.noneOf(AppointmentStatus.class),
            AppointmentStatus.NO_SHOW, EnumSet.noneOf(AppointmentStatus.class)
    );

    private void assertTransition(Appointment appointment, AppointmentStatus next) {
        AppointmentStatus current = appointment.getStatus();
        Set<AppointmentStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, EnumSet.noneOf(AppointmentStatus.class));
        if (!allowed.contains(next)) {
            throw new InvalidStatusTransitionException(current, next);
        }
    }

    @Transactional
    public AppointmentDTO cancelAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        assertTransition(appointment, AppointmentStatus.CANCELLED);
        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);

        branchRepository.findById(saved.getBranchId()).ifPresent(branch ->
                topicRepository.findById(saved.getTopicId()).ifPresent(topic ->
                        emailService.sendCancellation(
                                saved.getCustomerEmail(),
                                saved.getCustomerName(),
                                saved.getAppointmentDateTime(),
                                branch.getName(),
                                topic.getName()
                        )
                )
        );

        return toDTO(saved);
    }

    @Transactional
    public AppointmentDTO rescheduleAppointment(Long id, LocalDateTime newDateTime) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        if (appointment.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new InvalidStatusTransitionException(appointment.getStatus(), AppointmentStatus.SCHEDULED);
        }
        LocalDateTime oldDateTime = appointment.getAppointmentDateTime();
        appointment.setAppointmentDateTime(newDateTime);
        appointment.setReminder24hSent(false);
        appointment.setReminder1hSent(false);
        Appointment saved = appointmentRepository.save(appointment);

        branchRepository.findById(saved.getBranchId()).ifPresent(branch ->
                topicRepository.findById(saved.getTopicId()).ifPresent(topic ->
                        emailService.sendRescheduleConfirmation(
                                saved.getCustomerEmail(),
                                saved.getCustomerName(),
                                oldDateTime,
                                saved.getAppointmentDateTime(),
                                branch.getName(),
                                branch.getAddress(),
                                branch.getWeekdayHours(),
                                topic.getName()
                        )
                )
        );

        return toDTO(saved);
    }

    @Transactional
    public AppointmentDTO completeAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        assertTransition(appointment, AppointmentStatus.COMPLETED);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentDTO markArrived(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        assertTransition(appointment, AppointmentStatus.ARRIVED);
        appointment.setStatus(AppointmentStatus.ARRIVED);
        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentDTO markNoShow(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        assertTransition(appointment, AppointmentStatus.NO_SHOW);
        appointment.setStatus(AppointmentStatus.NO_SHOW);
        return toDTO(appointmentRepository.save(appointment));
    }

    // -------------------------------------------------------------------------
    // Reminders (manual trigger via DevController)
    // -------------------------------------------------------------------------

    @Transactional
    public ReminderDispatchResult sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();

        List<Appointment> due24h = appointmentRepository
                .findByStatusAndAppointmentDateTimeBetweenAndReminder24hSentFalse(
                        AppointmentStatus.SCHEDULED,
                        now.plusHours(23),
                        now.plusHours(25));

        int sent24h = 0;
        for (Appointment appt : due24h) {
            dispatchReminder(appt, "tomorrow");
            appt.setReminder24hSent(true);
            appointmentRepository.save(appt);
            sent24h++;
        }

        List<Appointment> due1h = appointmentRepository
                .findByStatusAndAppointmentDateTimeBetweenAndReminder1hSentFalse(
                        AppointmentStatus.SCHEDULED,
                        now.plusMinutes(45),
                        now.plusMinutes(75));

        int sent1h = 0;
        for (Appointment appt : due1h) {
            dispatchReminder(appt, "in 1 hour");
            appt.setReminder1hSent(true);
            appointmentRepository.save(appt);
            sent1h++;
        }

        return new ReminderDispatchResult(sent24h, sent1h);
    }

    private void dispatchReminder(Appointment appt, String windowLabel) {
        branchRepository.findById(appt.getBranchId()).ifPresent(branch ->
                topicRepository.findById(appt.getTopicId()).ifPresent(topic ->
                        emailService.sendReminder(
                                appt.getCustomerEmail(),
                                appt.getCustomerName(),
                                appt.getAppointmentDateTime(),
                                branch.getName(),
                                branch.getAddress(),
                                topic.getName(),
                                windowLabel
                        )
                )
        );
    }
}

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
import java.util.List;
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
        if (minute != 0) {
            throw new IllegalArgumentException("Appointments must start on the hour (e.g., 09:00, 10:00)");
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

    @Transactional
    public AppointmentDTO cancelAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        appointment.setStatus(AppointmentStatus.CANCELLED);
        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentDTO rescheduleAppointment(Long id, LocalDateTime newDateTime) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        appointment.setAppointmentDateTime(newDateTime);
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        return toDTO(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentDTO completeAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        appointment.setStatus(AppointmentStatus.COMPLETED);
        return toDTO(appointmentRepository.save(appointment));
    }
}

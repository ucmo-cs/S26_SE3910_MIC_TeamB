package com.example.bank_backend.appointment;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

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

    @Transactional
    public AppointmentDTO bookAppointment(AppointmentDTO dto) {
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

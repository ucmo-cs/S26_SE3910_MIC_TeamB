package com.example.bank_backend.appointment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByBranchId(Long branchId);

    List<Appointment> findByCustomerEmail(String customerEmail);

    List<Appointment> findByStatus(AppointmentStatus status);

    List<Appointment> findByAppointmentDateTimeBetween(LocalDateTime start, LocalDateTime end);

    boolean existsByBranchIdAndAppointmentDateTimeAndStatus(
            Long branchId, LocalDateTime appointmentDateTime, AppointmentStatus status);
}

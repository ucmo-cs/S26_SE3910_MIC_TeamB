package com.example.bank_backend.appointment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    // -------------------------------------------------------------------------
    // Book a new appointment
    // -------------------------------------------------------------------------

    @PostMapping
    public ResponseEntity<AppointmentDTO> bookAppointment(@Valid @RequestBody AppointmentDTO dto) {
        AppointmentDTO created = appointmentService.bookAppointment(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    @GetMapping
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<List<AppointmentDTO>> getByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByBranch(branchId));
    }

    /**
     * Returns appointments for the given email. The authenticated user's email
     * (from the JWT principal) must match the requested email — users may only
     * view their own appointments.
     */
    @GetMapping("/customer")
    public ResponseEntity<List<AppointmentDTO>> getByCustomerEmail(
            @RequestParam String email,
            Authentication authentication) {
        String authenticatedEmail = authentication.getName();
        if (!authenticatedEmail.equals(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.getAppointmentsByEmail(email));
    }

    @GetMapping("/range")
    public ResponseEntity<List<AppointmentDTO>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDateRange(start, end));
    }

    // -------------------------------------------------------------------------
    // Status transitions
    // -------------------------------------------------------------------------

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentDTO> cancelAppointment(@PathVariable Long id, Authentication authentication) {
        if (!isOwnerOrAdmin(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.cancelAppointment(id));
    }

    @PutMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentDTO> rescheduleAppointment(
            @PathVariable Long id,
            @RequestBody @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime newDateTime,
            Authentication authentication) {
        if (!isOwnerOrAdmin(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, newDateTime));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<AppointmentDTO> completeAppointment(@PathVariable Long id, Authentication authentication) {
        if (!isOwnerOrAdmin(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.completeAppointment(id));
    }

    private boolean isOwnerOrAdmin(Long appointmentId, Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) return true;
        AppointmentDTO appt = appointmentService.getAppointmentById(appointmentId);
        return appt.getCustomerEmail().equals(authentication.getName());
    }
}

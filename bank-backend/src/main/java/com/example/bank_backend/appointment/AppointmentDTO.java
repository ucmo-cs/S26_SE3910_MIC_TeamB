package com.example.bank_backend.appointment;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDTO {

    private Long id;

    @NotBlank(message = "Customer name is required")
    @Size(max = 100, message = "Customer name must be 100 characters or fewer")
    @Pattern(regexp = "^[\\p{L}\\s'\\-]+$", message = "Customer name may only contain letters, spaces, hyphens, and apostrophes")
    private String customerName;

    @NotBlank(message = "Customer email is required")
    @Email(message = "Invalid email format")
    private String customerEmail;

    @NotNull(message = "Branch ID is required")
    private Long branchId;

    @NotNull(message = "Topic ID is required")
    private Long topicId;

    @NotNull(message = "Appointment date/time is required")
    @Future(message = "Appointment must be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime appointmentDateTime;

    private AppointmentStatus status;

    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

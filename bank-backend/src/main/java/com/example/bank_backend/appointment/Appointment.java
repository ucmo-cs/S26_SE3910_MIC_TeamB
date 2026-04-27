package com.example.bank_backend.appointment;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String customerEmail;

    /** Foreign key to branch — owned by another team member, stored as raw ID. */
    @Column(nullable = false)
    private Long branchId;

    /** Foreign key to topic — owned by another team member, stored as raw ID. */
    @Column(nullable = false)
    private Long topicId;

    @Column(nullable = false)
    private LocalDateTime appointmentDateTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean reminder24hSent = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean reminder1hSent = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = AppointmentStatus.SCHEDULED;
        }
    }
}

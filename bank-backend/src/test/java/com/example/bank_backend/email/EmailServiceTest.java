package com.example.bank_backend.email;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private MimeMessage mimeMessage;

    private EmailService service;

    private final LocalDateTime appointmentTime = LocalDateTime.of(2027, 1, 15, 10, 0);

    @BeforeEach
    void setUp() {
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        service = new EmailService(mailSender, "noreply@commerce.example");
    }

    @Test
    void sendBookingConfirmation_callsMailSenderOnce() {
        service.sendBookingConfirmation(
                "jane@example.com", "Jane Doe", appointmentTime,
                "Downtown", "123 Main St", "9-5", "Savings Account");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendCancellation_callsMailSenderOnce() {
        service.sendCancellation(
                "jane@example.com", "Jane Doe", appointmentTime,
                "Downtown", "Savings Account");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendRescheduleConfirmation_callsMailSenderOnce() {
        service.sendRescheduleConfirmation(
                "jane@example.com", "Jane Doe",
                appointmentTime, appointmentTime.plusDays(2),
                "Downtown", "123 Main St", "9-5", "Savings Account");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void sendReminder_callsMailSenderOnce() {
        service.sendReminder(
                "jane@example.com", "Jane Doe", appointmentTime,
                "Downtown", "123 Main St", "Savings Account", "tomorrow");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}

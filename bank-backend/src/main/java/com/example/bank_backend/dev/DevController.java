package com.example.bank_backend.dev;

import com.example.bank_backend.appointment.AppointmentService;
import com.example.bank_backend.appointment.ReminderDispatchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevController {

    private final AppointmentService appointmentService;

    @PostMapping("/send-reminders")
    public ResponseEntity<ReminderDispatchResult> sendReminders() {
        return ResponseEntity.ok(appointmentService.sendDueReminders());
    }
}

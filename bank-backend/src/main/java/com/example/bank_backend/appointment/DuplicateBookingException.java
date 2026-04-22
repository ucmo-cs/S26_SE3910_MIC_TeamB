package com.example.bank_backend.appointment;

import java.time.LocalDateTime;

public class DuplicateBookingException extends RuntimeException {

    public DuplicateBookingException(Long branchId, LocalDateTime dateTime) {
        super("Time slot " + dateTime + " is already booked at branch " + branchId);
    }
}

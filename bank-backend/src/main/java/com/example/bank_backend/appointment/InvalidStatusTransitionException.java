package com.example.bank_backend.appointment;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(AppointmentStatus from, AppointmentStatus to) {
        super("Cannot transition appointment from " + from + " to " + to);
    }
}

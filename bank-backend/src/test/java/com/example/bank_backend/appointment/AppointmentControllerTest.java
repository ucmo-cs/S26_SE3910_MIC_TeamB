package com.example.bank_backend.appointment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.example.bank_backend.auth.JwtUtil;
import com.example.bank_backend.auth.UserRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AppointmentController.class)
@WithMockUser(username = "jane@example.com")
class AppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppointmentService appointmentService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    private ObjectMapper objectMapper;

    private final LocalDateTime appointmentTime = LocalDateTime.of(2027, 6, 15, 10, 0);

    private AppointmentDTO sampleDTO() {
        return AppointmentDTO.builder()
                .id(1L)
                .customerName("Jane Doe")
                .customerEmail("jane@example.com")
                .branchId(1L)
                .topicId(2L)
                .appointmentDateTime(appointmentTime)
                .status(AppointmentStatus.SCHEDULED)
                .notes("First visit")
                .createdAt(LocalDateTime.of(2026, 3, 1, 9, 0))
                .build();
    }

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // -------------------------------------------------------------------------
    // POST /api/appointments
    // -------------------------------------------------------------------------

    @Test
    void bookAppointment_returns201AndBody() throws Exception {
        when(appointmentService.bookAppointment(any(AppointmentDTO.class))).thenReturn(sampleDTO());

        mockMvc.perform(post("/api/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.customerName").value("Jane Doe"))
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void bookAppointment_returnsNotesInResponse() throws Exception {
        AppointmentDTO withNotes = sampleDTO();
        withNotes.setNotes("Need help with savings account");
        when(appointmentService.bookAppointment(any(AppointmentDTO.class))).thenReturn(withNotes);

        mockMvc.perform(post("/api/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(withNotes)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.notes").value("Need help with savings account"));
    }

    @Test
    void bookAppointment_rejectsNotesOver500Chars() throws Exception {
        AppointmentDTO tooLong = sampleDTO();
        tooLong.setNotes("a".repeat(501));

        mockMvc.perform(post("/api/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooLong)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));

        verify(appointmentService, never()).bookAppointment(any(AppointmentDTO.class));
    }

    @Test
    void bookAppointment_returns400_whenValidationFails() throws Exception {
        // Missing required fields
        AppointmentDTO invalid = AppointmentDTO.builder().build();

        mockMvc.perform(post("/api/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    void bookAppointment_returns409_whenSlotAlreadyBooked() throws Exception {
        when(appointmentService.bookAppointment(any(AppointmentDTO.class)))
                .thenThrow(new DuplicateBookingException(1L, appointmentTime));

        mockMvc.perform(post("/api/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already booked")));
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments
    // -------------------------------------------------------------------------

    @Test
    void getAllAppointments_returns200WithList() throws Exception {
        when(appointmentService.getAllAppointments()).thenReturn(List.of(sampleDTO()));

        mockMvc.perform(get("/api/appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].customerEmail").value("jane@example.com"));
    }

    @Test
    void getAllAppointments_returnsEmptyList() throws Exception {
        when(appointmentService.getAllAppointments()).thenReturn(List.of());

        mockMvc.perform(get("/api/appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments/{id}
    // -------------------------------------------------------------------------

    @Test
    void getAppointmentById_returns200_whenFound() throws Exception {
        when(appointmentService.getAppointmentById(1L)).thenReturn(sampleDTO());

        mockMvc.perform(get("/api/appointments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void getAppointmentById_returns404_whenNotFound() throws Exception {
        when(appointmentService.getAppointmentById(99L))
                .thenThrow(new AppointmentNotFoundException(99L));

        mockMvc.perform(get("/api/appointments/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Appointment not found with id: 99"));
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments/branch/{branchId}
    // -------------------------------------------------------------------------

    @Test
    void getByBranch_returns200WithList() throws Exception {
        when(appointmentService.getAppointmentsByBranch(1L)).thenReturn(List.of(sampleDTO()));

        mockMvc.perform(get("/api/appointments/branch/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments/customer?email=
    // (Fix #9: must match authenticated user)
    // -------------------------------------------------------------------------

    @Test
    void getByCustomerEmail_returns200_whenEmailMatchesAuthUser() throws Exception {
        when(appointmentService.getAppointmentsByEmail("jane@example.com")).thenReturn(List.of(sampleDTO()));

        mockMvc.perform(get("/api/appointments/customer").param("email", "jane@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getByCustomerEmail_returns403_whenEmailDoesNotMatchAuthUser() throws Exception {
        // Authenticated as jane@example.com but requesting someone else's data
        mockMvc.perform(get("/api/appointments/customer").param("email", "other@example.com"))
                .andExpect(status().isForbidden());

        verify(appointmentService, never()).getAppointmentsByEmail(anyString());
    }

    // -------------------------------------------------------------------------
    // GET /api/appointments/range?start=&end=
    // -------------------------------------------------------------------------

    @Test
    void getByDateRange_returns200WithList() throws Exception {
        when(appointmentService.getAppointmentsByDateRange(any(), any())).thenReturn(List.of(sampleDTO()));

        mockMvc.perform(get("/api/appointments/range")
                        .param("start", "2026-04-01T00:00:00")
                        .param("end", "2026-04-30T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // -------------------------------------------------------------------------
    // PUT /api/appointments/{id}/cancel
    // -------------------------------------------------------------------------

    @Test
    void cancelAppointment_returns200WithCancelledStatus() throws Exception {
        AppointmentDTO cancelled = sampleDTO();
        cancelled.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentService.cancelAppointment(1L)).thenReturn(cancelled);

        mockMvc.perform(put("/api/appointments/1/cancel")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void cancelAppointment_returns404_whenNotFound() throws Exception {
        when(appointmentService.cancelAppointment(99L))
                .thenThrow(new AppointmentNotFoundException(99L));

        mockMvc.perform(put("/api/appointments/99/cancel")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // PUT /api/appointments/{id}/reschedule
    // -------------------------------------------------------------------------

    @Test
    void rescheduleAppointment_returns200WithNewDateTime() throws Exception {
        LocalDateTime newTime = appointmentTime.plusDays(3);
        AppointmentDTO rescheduled = sampleDTO();
        rescheduled.setAppointmentDateTime(newTime);
        when(appointmentService.rescheduleAppointment(eq(1L), any(LocalDateTime.class))).thenReturn(rescheduled);

        mockMvc.perform(put("/api/appointments/1/reschedule")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newTime)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    // -------------------------------------------------------------------------
    // PUT /api/appointments/{id}/complete
    // -------------------------------------------------------------------------

    @Test
    void completeAppointment_returns200WithCompletedStatus() throws Exception {
        AppointmentDTO completed = sampleDTO();
        completed.setStatus(AppointmentStatus.COMPLETED);
        when(appointmentService.completeAppointment(1L)).thenReturn(completed);

        mockMvc.perform(put("/api/appointments/1/complete")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void completeAppointment_returns404_whenNotFound() throws Exception {
        when(appointmentService.completeAppointment(99L))
                .thenThrow(new AppointmentNotFoundException(99L));

        mockMvc.perform(put("/api/appointments/99/complete")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // PUT /api/appointments/{id}/arrive
    // -------------------------------------------------------------------------

    @Test
    void markArrived_returns200WithArrivedStatus() throws Exception {
        AppointmentDTO arrived = sampleDTO();
        arrived.setStatus(AppointmentStatus.ARRIVED);
        when(appointmentService.markArrived(1L)).thenReturn(arrived);

        mockMvc.perform(put("/api/appointments/1/arrive")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARRIVED"));
    }

    @Test
    void markArrived_returns409_whenInvalidTransition() throws Exception {
        when(appointmentService.markArrived(1L))
                .thenThrow(new InvalidStatusTransitionException(
                        AppointmentStatus.CANCELLED, AppointmentStatus.ARRIVED));

        mockMvc.perform(put("/api/appointments/1/arrive")
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    void markArrived_returns404_whenNotFound() throws Exception {
        when(appointmentService.markArrived(99L))
                .thenThrow(new AppointmentNotFoundException(99L));

        mockMvc.perform(put("/api/appointments/99/arrive")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // PUT /api/appointments/{id}/no-show
    // -------------------------------------------------------------------------

    @Test
    void markNoShow_returns200WithNoShowStatus() throws Exception {
        AppointmentDTO noShow = sampleDTO();
        noShow.setStatus(AppointmentStatus.NO_SHOW);
        when(appointmentService.markNoShow(1L)).thenReturn(noShow);

        mockMvc.perform(put("/api/appointments/1/no-show")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NO_SHOW"));
    }

    @Test
    void markNoShow_returns409_whenInvalidTransition() throws Exception {
        when(appointmentService.markNoShow(1L))
                .thenThrow(new InvalidStatusTransitionException(
                        AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW));

        mockMvc.perform(put("/api/appointments/1/no-show")
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    void markNoShow_returns404_whenNotFound() throws Exception {
        when(appointmentService.markNoShow(99L))
                .thenThrow(new AppointmentNotFoundException(99L));

        mockMvc.perform(put("/api/appointments/99/no-show")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }
}

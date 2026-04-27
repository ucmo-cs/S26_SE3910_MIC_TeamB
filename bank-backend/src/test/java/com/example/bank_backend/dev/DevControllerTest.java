package com.example.bank_backend.dev;

import com.example.bank_backend.appointment.AppointmentService;
import com.example.bank_backend.appointment.ReminderDispatchResult;
import com.example.bank_backend.auth.JwtUtil;
import com.example.bank_backend.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DevController.class)
class DevControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppointmentService appointmentService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void sendReminders_returns200_forAdmin() throws Exception {
        when(appointmentService.sendDueReminders()).thenReturn(new ReminderDispatchResult(2, 1));

        mockMvc.perform(post("/api/dev/send-reminders").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent24h").value(2))
                .andExpect(jsonPath("$.sent1h").value(1));
    }

    @Test
    @WithMockUser(roles = "USER")
    void sendReminders_returns403_forNonAdmin() throws Exception {
        mockMvc.perform(post("/api/dev/send-reminders").with(csrf()))
                .andExpect(status().isForbidden());
    }
}

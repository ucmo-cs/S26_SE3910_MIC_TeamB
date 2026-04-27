package com.example.bank_backend.analytics;

import com.example.bank_backend.auth.JwtUtil;
import com.example.bank_backend.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalyticsService analyticsService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void summary_returns200_forAdmin() throws Exception {
        AnalyticsSummaryResponse response = new AnalyticsSummaryResponse(
                42L,
                0.1234,
                List.of(new TopicCount("Checking", 5L)),
                List.of(new BranchCount("Downtown", 4L)),
                List.of(new HourCount(10, 3L))
        );
        when(analyticsService.summary()).thenReturn(response);

        mockMvc.perform(get("/api/analytics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAppointments").value(42))
                .andExpect(jsonPath("$.noShowRate").value(0.1234))
                .andExpect(jsonPath("$.topTopics[0].topic").value("Checking"))
                .andExpect(jsonPath("$.busiestBranches[0].branch").value("Downtown"))
                .andExpect(jsonPath("$.peakHours[0].hour").value(10));
    }

    @Test
    @WithMockUser(roles = "USER")
    void summary_returns403_forNonAdmin() throws Exception {
        mockMvc.perform(get("/api/analytics/summary"))
                .andExpect(status().isForbidden());
    }
}

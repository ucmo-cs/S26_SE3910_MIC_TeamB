package com.example.bank_backend.email;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.from}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Async
    public void sendBookingConfirmation(
            String toEmail,
            String customerName,
            LocalDateTime appointmentDateTime,
            String branchName,
            String branchAddress,
            String branchWeekdayHours,
            String topicName
    ) {
        String body = buildShell(
                "Appointment Confirmed!",
                "Hi " + customerName + ", your appointment has been successfully scheduled.",
                buildDetailRows(topicName, appointmentDateTime, branchName, branchAddress),
                "Need to reschedule or cancel? Log in to your Commerce Bank account and visit <strong>My Appointments</strong>.",
                "Please arrive 5 minutes early. Bring a valid photo ID."
        );
        send(toEmail, "Appointment Confirmed – Commerce Bank", body, "confirmation");
    }

    @Async
    public void sendCancellation(
            String toEmail,
            String customerName,
            LocalDateTime appointmentDateTime,
            String branchName,
            String topicName
    ) {
        String body = buildShell(
                "Appointment Cancelled",
                "Hi " + customerName + ", your appointment has been cancelled.",
                buildDetailRows(topicName, appointmentDateTime, branchName, null),
                "Need to book a new appointment? Log in to your Commerce Bank account.",
                "If this cancellation was not made by you, please contact us immediately."
        );
        send(toEmail, "Appointment Cancelled – Commerce Bank", body, "cancellation");
    }

    @Async
    public void sendRescheduleConfirmation(
            String toEmail,
            String customerName,
            LocalDateTime oldDateTime,
            LocalDateTime newDateTime,
            String branchName,
            String branchAddress,
            String branchWeekdayHours,
            String topicName
    ) {
        String previousLine = "Previous time: " + oldDateTime.format(DATE_FMT) + " at " + oldDateTime.format(TIME_FMT);
        String body = buildShell(
                "Appointment Updated",
                "Hi " + customerName + ", your appointment has been rescheduled. " + previousLine + ".",
                buildDetailRows(topicName, newDateTime, branchName, branchAddress),
                "Need to make further changes? Log in and visit <strong>My Appointments</strong>.",
                "Please arrive 5 minutes early. Bring a valid photo ID."
        );
        send(toEmail, "Appointment Updated – Commerce Bank", body, "reschedule");
    }

    @Async
    public void sendReminder(
            String toEmail,
            String customerName,
            LocalDateTime appointmentDateTime,
            String branchName,
            String branchAddress,
            String topicName,
            String windowLabel
    ) {
        String body = buildShell(
                "Appointment Reminder",
                "Hi " + customerName + ", this is a friendly reminder that your appointment is " + windowLabel + ".",
                buildDetailRows(topicName, appointmentDateTime, branchName, branchAddress),
                "Need to reschedule or cancel? Log in to your Commerce Bank account.",
                "Please arrive 5 minutes early. Bring a valid photo ID."
        );
        send(toEmail, "Appointment Reminder – Commerce Bank", body, "reminder");
    }

    // -------------------------------------------------------------------------
    // Internal send + template helpers
    // -------------------------------------------------------------------------

    private void send(String toEmail, String subject, String html, String label) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("{} email sent to {}", label, toEmail);
        } catch (Exception e) {
            log.error("Failed to send {} email to {}: {}", label, toEmail, e.getMessage());
        }
    }

    private String buildDetailRows(String topicName, LocalDateTime dt, String branchName, String branchAddress) {
        StringBuilder sb = new StringBuilder();
        sb.append(row("Service", topicName));
        sb.append(row("Date", dt.format(DATE_FMT)));
        sb.append(row("Time", dt.format(TIME_FMT)));
        sb.append(row("Branch", branchName));
        if (branchAddress != null) {
            sb.append(row("Address", branchAddress));
        }
        return sb.toString();
    }

    private String buildShell(String headline, String intro, String detailRows,
                              String primaryCta, String secondaryCta) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;">

                        <!-- Header -->
                        <tr>
                          <td style="background:#1a4d2e;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                              Commerce Bank
                            </h1>
                          </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                          <td style="background:#ffffff;padding:40px;">
                            <h2 style="margin:0 0 8px;color:#1a4d2e;font-size:24px;text-align:center;">
                              %s
                            </h2>
                            <p style="margin:0 0 28px;color:#555;font-size:15px;text-align:center;">
                              %s
                            </p>

                            <!-- Details card -->
                            <table width="100%%" cellpadding="0" cellspacing="0"
                                   style="background:#f8faf8;border:1px solid #d4e8d4;border-radius:10px;margin-bottom:28px;">
                              <tr>
                                <td style="padding:24px 28px;">
                                  <table width="100%%" cellpadding="0" cellspacing="0">
                                    %s
                                  </table>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6;">%s</p>
                            <p style="margin:0;color:#888;font-size:13px;">%s</p>

                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background:#f0f4f0;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
                            <p style="margin:0;color:#888;font-size:12px;">
                              © 2026 Commerce Bank. This is an automated message — please do not reply.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(headline, intro, detailRows, primaryCta, secondaryCta);
    }

    private String row(String label, String value) {
        return """
                <tr>
                  <td style="padding:8px 0;color:#777;font-size:13px;font-weight:600;
                             text-transform:uppercase;letter-spacing:0.05em;width:120px;
                             vertical-align:top;">%s</td>
                  <td style="padding:8px 0;color:#1a1a1a;font-size:15px;font-weight:500;
                             vertical-align:top;">%s</td>
                </tr>
                """.formatted(label, value);
    }
}

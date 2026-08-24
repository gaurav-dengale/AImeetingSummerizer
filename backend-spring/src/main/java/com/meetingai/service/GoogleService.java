package com.meetingai.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import com.meetingai.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class GoogleService {

    private static final Logger log = LoggerFactory.getLogger(GoogleService.class);
    private static final String APPLICATION_NAME = "VexaMeet Assistant";
    private static final String USER_ID = "default-user";
    private static final List<String> SCOPES = List.of(
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/gmail.send"
    );

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static NetHttpTransport HTTP_TRANSPORT;

    static {
        try {
            HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize Google HTTP transport", e);
        }
    }

    private final AppProperties appProperties;
    private GoogleAuthorizationCodeFlow flow;

    public GoogleService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    private File resolveCredentialsFile() {
        File f = new File(appProperties.getGoogleCredentialsPath());
        if (f.exists()) return f;
        File fallback = new File("../" + appProperties.getGoogleCredentialsPath());
        if (fallback.exists()) return fallback;
        return null;
    }

    public boolean hasCredentialsFile() {
        return resolveCredentialsFile() != null;
    }

    private synchronized GoogleAuthorizationCodeFlow getFlow() {
        if (flow != null) return flow;
        File credFile = resolveCredentialsFile();
        if (credFile == null) return null;

        try (FileReader reader = new FileReader(credFile)) {
            GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, reader);
            FileDataStoreFactory dataStoreFactory = new FileDataStoreFactory(new File(appProperties.getGoogleTokenPath()));
            flow = new GoogleAuthorizationCodeFlow.Builder(HTTP_TRANSPORT, JSON_FACTORY, clientSecrets, SCOPES)
                    .setDataStoreFactory(dataStoreFactory)
                    .setAccessType("offline")
                    .build();
            return flow;
        } catch (Exception e) {
            log.error("Failed to initialize Google OAuth flow: {}", e.getMessage());
            return null;
        }
    }

    public String buildAuthorizationUrl(String redirectUri) {
        GoogleAuthorizationCodeFlow f = getFlow();
        if (f == null) return null;
        try {
            return f.newAuthorizationUrl()
                    .setRedirectUri(redirectUri)
                    .setAccessType("offline")
                    .set("prompt", "consent")
                    .build();
        } catch (Exception e) {
            log.error("Error building Google authorization URL: {}", e.getMessage());
            return null;
        }
    }

    public boolean exchangeCodeForToken(String code, String redirectUri) {
        GoogleAuthorizationCodeFlow f = getFlow();
        if (f == null) return false;
        try {
            TokenResponse tokenResponse = f.newTokenRequest(code).setRedirectUri(redirectUri).execute();
            f.createAndStoreCredential(tokenResponse, USER_ID);
            log.info("Google OAuth authorization successful; credential stored.");
            return true;
        } catch (Exception e) {
            log.error("Error exchanging Google authorization code for token: {}", e.getMessage());
            return false;
        }
    }

    private Credential getCredential() {
        GoogleAuthorizationCodeFlow f = getFlow();
        if (f == null) return null;
        try {
            Credential credential = f.loadCredential(USER_ID);
            if (credential == null) {
                return null;
            }
            if (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() <= 60) {
                credential.refreshToken();
            }
            return credential;
        } catch (Exception e) {
            log.error("Error loading/refreshing Google credential: {}", e.getMessage());
            return null;
        }
    }

    public boolean hasValidToken() {
        return getCredential() != null;
    }

    public boolean sendTaskEmail(String recipientName, String recipientEmail, String task, String dueDate) {
        Credential credential = getCredential();
        if (credential == null) {
            log.warn("No valid Google credentials found. Cannot send task email to {}", recipientEmail);
            return false;
        }

        try {
            Gmail gmail = new Gmail.Builder(HTTP_TRANSPORT, JSON_FACTORY, credential)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            String dueDateStr = formatDueDate(dueDate);
            String subject = "Task Assignment: " + (task.length() > 50 ? task.substring(0, 50) + "..." : task);
            String body = "<html><body>"
                    + "<p>Hi " + capitalize(recipientName) + ",</p>"
                    + "<p>You've been assigned the following task:</p>"
                    + "<div style=\"padding: 10px; background-color: #f0f0f0; border-left: 4px solid #2196F3;\">"
                    + "<p><strong>" + task + "</strong></p>"
                    + (dueDateStr != null ? "<p>" + dueDateStr + "</p>" : "")
                    + "</div>"
                    + "<p>This task was automatically assigned based on a meeting transcript.</p>"
                    + "<p>Best regards,<br>Meeting Assistant</p>"
                    + "</body></html>";

            String rawMessage = "To: " + recipientEmail + "\r\n"
                    + "Subject: " + subject + "\r\n"
                    + "MIME-Version: 1.0\r\n"
                    + "Content-Type: text/html; charset=UTF-8\r\n\r\n"
                    + body;

            String encodedEmail = Base64.getUrlEncoder().encodeToString(rawMessage.getBytes(StandardCharsets.UTF_8));
            Message message = new Message();
            message.setRaw(encodedEmail);

            Message sent = gmail.users().messages().send("me", message).execute();
            log.info("Email sent to {}, Message Id: {}", recipientEmail, sent.getId());
            return true;
        } catch (Exception e) {
            log.error("Error sending task email to {}: {}", recipientEmail, e.getMessage());
            return false;
        }
    }

    public String createCalendarEvent(String title, String startTime, String endTime, List<String> attendees, String location, String notes) {
        Credential credential = getCredential();
        if (credential == null) {
            log.warn("No valid Google credentials found. Calendar event cannot be created. Visit /authorize_google to authorize access.");
            return null;
        }

        try {
            Calendar calendarService = new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, credential)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            Event event = new Event()
                    .setSummary(title)
                    .setDescription("Automatically scheduled from transcript. Notes: " + (notes != null ? notes : ""));

            event.setStart(new EventDateTime().setDateTime(new DateTime(startTime)).setTimeZone("Asia/Kolkata"));
            event.setEnd(new EventDateTime().setDateTime(new DateTime(endTime)).setTimeZone("Asia/Kolkata"));

            if (attendees != null && !attendees.isEmpty()) {
                List<EventAttendee> attendeeList = new ArrayList<>();
                for (String email : attendees) {
                    if (email != null && email.contains("@")) {
                        attendeeList.add(new EventAttendee().setEmail(email));
                    }
                }
                if (!attendeeList.isEmpty()) {
                    event.setAttendees(attendeeList);
                }
            }

            if (location != null && !location.isBlank()) {
                event.setLocation(location);
            }

            Event created = calendarService.events().insert("primary", event).execute();
            log.info("Calendar event created: {}", created.getHtmlLink());
            return created.getHtmlLink();
        } catch (Exception e) {
            log.error("Error creating calendar event: {}", e.getMessage());
            return null;
        }
    }

    private String formatDueDate(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) return null;
        try {
            LocalDate date = LocalDate.parse(dueDate.length() > 10 ? dueDate.substring(0, 10) : dueDate);
            return "Due date: " + date.format(DateTimeFormatter.ofPattern("EEEE, MMMM dd, yyyy"));
        } catch (DateTimeParseException e) {
            return "Due date: " + dueDate;
        }
    }

    /** Sends a custom HTML email to any address — used by DigestService (#6) */
    public boolean sendRawEmail(String toEmail, String subject, String htmlBody) {
        Credential credential = getCredential();
        if (credential == null) { log.warn("No Google credentials for raw email"); return false; }
        try {
            Gmail gmail = new Gmail.Builder(HTTP_TRANSPORT, JSON_FACTORY, credential)
                    .setApplicationName(APPLICATION_NAME).build();
            String rawMessage = "To: " + toEmail + "\r\n"
                    + "Subject: " + subject + "\r\n"
                    + "MIME-Version: 1.0\r\n"
                    + "Content-Type: text/html; charset=UTF-8\r\n\r\n" + htmlBody;
            String encoded = Base64.getUrlEncoder().encodeToString(
                    rawMessage.getBytes(StandardCharsets.UTF_8));
            Message message = new Message(); message.setRaw(encoded);
            gmail.users().messages().send("me", message).execute();
            return true;
        } catch (Exception e) { log.error("Raw email error: {}", e.getMessage()); return false; }
    }

    private String capitalize(String name) {
        if (name == null || name.isBlank()) return name;
        return name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
    }
}

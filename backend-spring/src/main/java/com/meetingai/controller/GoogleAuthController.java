package com.meetingai.controller;

import com.meetingai.service.GoogleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class GoogleAuthController {

    private final GoogleService googleService;

    public GoogleAuthController(GoogleService googleService) {
        this.googleService = googleService;
    }

    @GetMapping("/authorize_google")
    public void authorizeGoogle(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!googleService.hasCredentialsFile()) {
            response.setStatus(404);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\": \"credentials.json is missing in the project root directory.\"," +
                    "\"message\": \"Please set up your Google Cloud Console OAuth 2.0 Client ID credentials, " +
                    "download the JSON file, rename it to 'credentials.json', and place it in the project root folder.\"}");
            return;
        }

        String redirectUri = buildRedirectUri(request);
        String authorizationUrl = googleService.buildAuthorizationUrl(redirectUri);
        if (authorizationUrl == null) {
            response.setStatus(500);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Failed to initialize Google OAuth flow. Check credentials.json.\"}");
            return;
        }

        response.sendRedirect(authorizationUrl);
    }

    @GetMapping("/oauth2callback")
    public void oauth2Callback(@RequestParam(value = "code", required = false) String code,
                                HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!googleService.hasCredentialsFile()) {
            response.setStatus(404);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"credentials.json is missing in the project root directory.\"}");
            return;
        }

        if (code == null || code.isBlank()) {
            response.setStatus(400);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Missing authorization code from Google.\"}");
            return;
        }

        String redirectUri = buildRedirectUri(request);
        boolean success = googleService.exchangeCodeForToken(code, redirectUri);

        if (success) {
            response.sendRedirect("/");
        } else {
            response.setStatus(400);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Failed to complete Google authorization.\"}");
        }
    }

    private String buildRedirectUri(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        boolean defaultPort = ("http".equals(scheme) && port == 80) || ("https".equals(scheme) && port == 443);
        return scheme + "://" + host + (defaultPort ? "" : ":" + port) + "/oauth2callback";
    }
}

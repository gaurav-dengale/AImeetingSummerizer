package com.meetingai.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;

@Component
public class AppProperties {

    private static final Logger log = LoggerFactory.getLogger(AppProperties.class);
    private static final String RUNTIME_SETTINGS_FILE = "runtime-settings.properties";

    @Value("${vexa.api.key:}")
    private String vexaApiKey;

    @Value("${vexa.base.url:https://api.cloud.vexa.ai}")
    private String vexaBaseUrl;

    @Value("${slack.bot.token:}")
    private String slackBotToken;

    @Value("${contacts.csv.path:contacts.csv}")
    private String contactsCsvPath;

    @Value("${ai.service.url:http://127.0.0.1:5001}")
    private String aiServiceUrl;

    @Value("${google.credentials.path:credentials.json}")
    private String googleCredentialsPath;

    @Value("${google.token.path:tokens}")
    private String googleTokenPath;

    /**
     * Settings changed at runtime via the Settings API (Slack token, contacts CSV path,
     * Vexa base URL/key) are persisted here so they survive an application restart —
     * mirrors the old Python app's use of dotenv.set_key() against .env.
     */
    @PostConstruct
    public void loadRuntimeOverrides() {
        File file = new File(RUNTIME_SETTINGS_FILE);
        if (!file.exists()) return;

        Properties props = new Properties();
        try (FileInputStream in = new FileInputStream(file)) {
            props.load(in);
        } catch (IOException e) {
            log.warn("Could not read {}: {}", RUNTIME_SETTINGS_FILE, e.getMessage());
            return;
        }

        if (props.containsKey("slack.bot.token")) slackBotToken = props.getProperty("slack.bot.token");
        if (props.containsKey("contacts.csv.path")) contactsCsvPath = props.getProperty("contacts.csv.path");
        if (props.containsKey("vexa.base.url")) vexaBaseUrl = props.getProperty("vexa.base.url");
        if (props.containsKey("vexa.api.key")) vexaApiKey = props.getProperty("vexa.api.key");

        log.info("Loaded runtime settings overrides from {}", RUNTIME_SETTINGS_FILE);
    }

    private synchronized void persist(String key, String value) {
        Properties props = new Properties();
        File file = new File(RUNTIME_SETTINGS_FILE);
        if (file.exists()) {
            try (FileInputStream in = new FileInputStream(file)) {
                props.load(in);
            } catch (IOException e) {
                log.warn("Could not read existing {} before persisting {}: {}", RUNTIME_SETTINGS_FILE, key, e.getMessage());
            }
        }
        props.setProperty(key, value == null ? "" : value);
        try (FileOutputStream out = new FileOutputStream(file)) {
            props.store(out, "Runtime settings persisted by SettingsController");
        } catch (IOException e) {
            log.error("Could not persist {} to {}: {}", key, RUNTIME_SETTINGS_FILE, e.getMessage());
        }
    }

    public String getVexaApiKey() { return vexaApiKey; }
    public void setVexaApiKey(String vexaApiKey) {
        this.vexaApiKey = vexaApiKey;
        persist("vexa.api.key", vexaApiKey);
    }

    public String getVexaBaseUrl() { return vexaBaseUrl; }
    public void setVexaBaseUrl(String vexaBaseUrl) {
        this.vexaBaseUrl = vexaBaseUrl;
        persist("vexa.base.url", vexaBaseUrl);
    }

    public String getSlackBotToken() { return slackBotToken; }
    public void setSlackBotToken(String slackBotToken) {
        this.slackBotToken = slackBotToken;
        persist("slack.bot.token", slackBotToken);
    }

    public String getContactsCsvPath() { return contactsCsvPath; }
    public void setContactsCsvPath(String contactsCsvPath) {
        this.contactsCsvPath = contactsCsvPath;
        persist("contacts.csv.path", contactsCsvPath);
    }

    public String getAiServiceUrl() { return aiServiceUrl; }
    public void setAiServiceUrl(String aiServiceUrl) { this.aiServiceUrl = aiServiceUrl; }

    public String getGoogleCredentialsPath() { return googleCredentialsPath; }
    public String getGoogleTokenPath() { return googleTokenPath; }
}

package com.meetingai.service;

import com.meetingai.config.AppProperties;
import com.meetingai.model.Contact;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ContactsService {

    private static final Logger log = LoggerFactory.getLogger(ContactsService.class);
    private final AppProperties appProperties;
    private final Map<String, Contact> contactsCache = new ConcurrentHashMap<>();

    public ContactsService(AppProperties appProperties) {
        this.appProperties = appProperties;
        loadContacts();
    }

    public synchronized Map<String, Contact> loadContacts() {
        contactsCache.clear();
        String csvPath = appProperties.getContactsCsvPath();
        File file = new File(csvPath);

        if (!file.exists()) {
            File[] candidates = new File[] {
                new File(csvPath),
                new File("../" + csvPath),
                new File("contacts.csv"),
                new File("../contacts.csv"),
                new File("meetingAI/contacts.csv"),
                new File("../meetingAI/contacts.csv"),
                new File("d:/AImeeting/contacts.csv"),
                new File("d:/AImeeting/meetingAI/contacts.csv")
            };
            for (File c : candidates) {
                if (c.exists()) {
                    file = c;
                    break;
                }
            }
            if (!file.exists()) {
                log.warn("Contacts CSV file not found at: {}", csvPath);
                return contactsCache;
            }
        }

        try (CSVReader reader = new CSVReader(new FileReader(file))) {
            String[] header = reader.readNext();
            if (header == null) return contactsCache;

            int nameIdx = -1, emailIdx = -1, slackIdx = -1;
            for (int i = 0; i < header.length; i++) {
                String col = header[i].trim().toLowerCase();
                if (col.equals("name")) nameIdx = i;
                else if (col.equals("email")) emailIdx = i;
                else if (col.equals("slack_id") || col.equals("slack")) slackIdx = i;
            }

            if (nameIdx == -1 || emailIdx == -1) {
                log.error("CSV file must have 'name' and 'email' columns");
                return contactsCache;
            }

            String[] line;
            while ((line = reader.readNext()) != null) {
                if (line.length <= Math.max(nameIdx, emailIdx)) continue;
                String name = line[nameIdx] != null ? line[nameIdx].trim() : "";
                String email = line[emailIdx] != null ? line[emailIdx].trim() : "";
                String slackId = (slackIdx != -1 && line.length > slackIdx && line[slackIdx] != null) 
                        ? line[slackIdx].trim() : null;

                if (!name.isEmpty()) {
                    contactsCache.put(name.toLowerCase(), new Contact(name, email, slackId));
                }
            }

            log.info("Loaded {} contacts from CSV: {}", contactsCache.size(), file.getAbsolutePath());
        } catch (IOException | CsvValidationException e) {
            log.error("Error reading contacts CSV: {}", e.getMessage());
        }

        return contactsCache;
    }

    public Optional<Contact> findContact(String partialName) {
        if (partialName == null || partialName.isBlank()) return Optional.empty();
        if (contactsCache.isEmpty()) {
            loadContacts();
        }
        String query = partialName.trim().toLowerCase();

        if (contactsCache.containsKey(query)) {
            return Optional.of(contactsCache.get(query));
        }

        List<Contact> matches = new ArrayList<>();
        for (Map.Entry<String, Contact> entry : contactsCache.entrySet()) {
            if (entry.getKey().contains(query) || entry.getKey().startsWith(query)) {
                matches.add(entry.getValue());
            }
        }

        if (matches.size() == 1) {
            return Optional.of(matches.get(0));
        } else if (matches.size() > 1) {
            List<String> matchNames = matches.stream().map(Contact::getName).toList();
            log.info("Multiple contacts matched '{}': {} — refusing to guess, treating as no match.", query, matchNames);
            return Optional.empty();
        }

        return Optional.empty();
    }

    public Map<String, Contact> getAllContacts() {
        return Collections.unmodifiableMap(contactsCache);
    }
}

package com.meetingai.service;

import com.meetingai.config.AppProperties;
import com.slack.api.Slack;
import com.slack.api.methods.MethodsClient;
import com.slack.api.methods.SlackApiException;
import com.slack.api.methods.request.chat.ChatPostMessageRequest;
import com.slack.api.model.block.Blocks;
import com.slack.api.model.block.LayoutBlock;
import com.slack.api.model.block.composition.BlockCompositions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class SlackService {

    private static final Logger log = LoggerFactory.getLogger(SlackService.class);
    private final AppProperties appProperties;
    private MethodsClient slackClient;

    public SlackService(AppProperties appProperties) {
        this.appProperties = appProperties;
        initClient();
    }

    public synchronized void initClient() {
        String token = appProperties.getSlackBotToken();
        if (token != null && !token.isBlank()) {
            this.slackClient = Slack.getInstance().methods(token);
        } else {
            this.slackClient = null;
        }
    }

    public boolean isConnected() {
        return slackClient != null;
    }

    public boolean sendSlackMessage(String slackId, String recipientName, String task, String dueDate) {
        if (slackClient == null) {
            log.warn("No valid Slack client initialized. Please configure SLACK_BOT_TOKEN.");
            return false;
        }

        String dueDateStr = formatDueDate(dueDate);
        List<LayoutBlock> blocks = new ArrayList<>();

        blocks.add(Blocks.section(s -> s
            .text(BlockCompositions.markdownText(
                "Hi " + capitalize(recipientName) + ", you've been assigned a new task from a meeting:"
            ))
        ));

        blocks.add(Blocks.divider());

        blocks.add(Blocks.section(s -> s
            .text(BlockCompositions.markdownText("*Task:* " + task))
        ));

        if (dueDateStr != null && !dueDateStr.isBlank()) {
            blocks.add(Blocks.section(s -> s
                .text(BlockCompositions.markdownText("*" + dueDateStr + "*"))
            ));
        }

        blocks.add(Blocks.context(c -> c
            .elements(List.of(
                BlockCompositions.markdownText("This task was automatically assigned based on a meeting transcript")
            ))
        ));

        try {
            var response = slackClient.chatPostMessage(ChatPostMessageRequest.builder()
                .channel(slackId)
                .blocks(blocks)
                .text("New task assignment: " + task)
                .build()
            );

            if (response.isOk()) {
                log.info("Slack message sent to {} (ID: {}), timestamp: {}", recipientName, slackId, response.getTs());
                return true;
            } else {
                log.error("Slack API error: {}", response.getError());
                return false;
            }
        } catch (SlackApiException | IOException e) {
            log.error("Error posting message to Slack: {}", e.getMessage());
            return false;
        }
    }

    private String formatDueDate(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) return null;
        try {
            LocalDate date = LocalDate.parse(dueDate);
            return "Due date: " + date.format(DateTimeFormatter.ofPattern("EEEE, MMMM dd, yyyy"));
        } catch (DateTimeParseException e) {
            return "Due date: " + dueDate;
        }
    }

    private String capitalize(String name) {
        if (name == null || name.isBlank()) return name;
        return name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
    }
}

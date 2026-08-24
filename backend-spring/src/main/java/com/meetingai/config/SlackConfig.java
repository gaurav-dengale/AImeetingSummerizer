package com.meetingai.config;

import com.slack.api.Slack;
import com.slack.api.methods.MethodsClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SlackConfig {

    private final AppProperties appProperties;

    public SlackConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Bean
    public MethodsClient slackClient() {
        String token = appProperties.getSlackBotToken();
        if (token != null && !token.isBlank()) {
            return Slack.getInstance().methods(token);
        }
        return Slack.getInstance().methods();
    }
}

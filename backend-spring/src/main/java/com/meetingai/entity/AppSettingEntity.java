package com.meetingai.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** DB-backed settings store (#9) � replaces runtime .env mutation */
@Entity
@Table(name = "app_settings")
public class AppSettingEntity {

    @Id
    private String key;

    @Column(columnDefinition = "TEXT")
    private String value;

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public AppSettingEntity() {}

    public AppSettingEntity(String key, String value) {
        this.key = key;
        this.value = value;
        this.updatedAt = Instant.now();
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; this.updatedAt = Instant.now(); }
    public Instant getUpdatedAt() { return updatedAt; }
}

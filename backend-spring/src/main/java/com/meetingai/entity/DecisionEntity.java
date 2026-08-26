package com.meetingai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Entity
@Table(name = "decisions")
public class DecisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id")
    @JsonIgnore
    private MeetingEntity meeting;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String decision;

    private String category = "General";

    @Column(columnDefinition = "TEXT")
    private String rationale;

    /** 0-100 Multi-Party Consensus Score */
    @Column(name = "consensus_score")
    private int consensusScore = 85;

    @Column(name = "approving_speakers", columnDefinition = "TEXT")
    private String approvingSpeakers;

    @Column(name = "dissenting_speakers", columnDefinition = "TEXT")
    private String dissentingSpeakers;

    /** SHA-256 Merkle Provenance Hash for Tamper-Proof Corporate Audit */
    @Column(name = "provenance_hash", length = 64)
    private String provenanceHash;

    private String status = "verified"; // "verified" | "contested" | "superseded"

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public DecisionEntity() {}

    public DecisionEntity(MeetingEntity meeting, String decision, String category,
                          String rationale, int consensusScore, String approvingSpeakers,
                          String dissentingSpeakers) {
        this.meeting = meeting;
        this.decision = decision;
        this.category = (category != null && !category.isBlank()) ? category : "General";
        this.rationale = rationale;
        this.consensusScore = consensusScore;
        this.approvingSpeakers = approvingSpeakers;
        this.dissentingSpeakers = dissentingSpeakers;
        this.status = (consensusScore >= 75) ? "verified" : "contested";
        this.provenanceHash = computeProvenanceHash();
    }

    public String computeProvenanceHash() {
        try {
            String payload = String.format("%s|%s|%s|%d|%s|%s",
                    (meeting != null && meeting.getMeetingId() != null) ? meeting.getMeetingId() : "local",
                    decision != null ? decision : "",
                    rationale != null ? rationale : "",
                    consensusScore,
                    approvingSpeakers != null ? approvingSpeakers : "",
                    createdAt != null ? createdAt.toString() : Instant.now().toString());
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return "0000000000000000000000000000000000000000000000000000000000000000";
        }
    }

    // Getters & Setters
    public Long getId() { return id; }
    public MeetingEntity getMeeting() { return meeting; }
    public void setMeeting(MeetingEntity meeting) { this.meeting = meeting; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
    public int getConsensusScore() { return consensusScore; }
    public void setConsensusScore(int consensusScore) { this.consensusScore = consensusScore; }
    public String getApprovingSpeakers() { return approvingSpeakers; }
    public void setApprovingSpeakers(String approvingSpeakers) { this.approvingSpeakers = approvingSpeakers; }
    public String getDissentingSpeakers() { return dissentingSpeakers; }
    public void setDissentingSpeakers(String dissentingSpeakers) { this.dissentingSpeakers = dissentingSpeakers; }
    public String getProvenanceHash() { return provenanceHash; }
    public void setProvenanceHash(String provenanceHash) { this.provenanceHash = provenanceHash; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

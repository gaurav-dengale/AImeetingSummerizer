package com.meetingai.repository;

import com.meetingai.entity.MeetingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.Optional;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<MeetingEntity, Long> {

    Optional<MeetingEntity> findByMeetingId(String meetingId);

    // Auto-generated: SELECT * FROM meetings ORDER BY created_at DESC
    List<MeetingEntity> findAllByOrderByCreatedAtDesc();

    // Auto-generated: Count meetings created after a specific timestamp
    long countByCreatedAtAfter(Instant after);
}


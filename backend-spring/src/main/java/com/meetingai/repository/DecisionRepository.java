package com.meetingai.repository;

import com.meetingai.entity.DecisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DecisionRepository extends JpaRepository<DecisionEntity, Long> {
    List<DecisionEntity> findByMeetingIdOrderByCreatedAtDesc(Long meetingId);
    Optional<DecisionEntity> findByProvenanceHash(String provenanceHash);
    List<DecisionEntity> findAllByOrderByCreatedAtDesc();
}

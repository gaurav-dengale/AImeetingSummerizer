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

    /** All active (non-superseded) decisions for reversal comparison */
    List<DecisionEntity> findByStatusNotOrderByCreatedAtDesc(String status);

    /** Find decisions superseded by a specific decision ID */
    List<DecisionEntity> findBySupersededById(Long supersededById);

    /** Find the decision that supersedes a specific original */
    Optional<DecisionEntity> findBySupersedesId(Long supersedesId);

    /** Count active decisions per category for stability scoring */
    long countByStatusAndCategory(String status, String category);
}

package com.meetingai.repository;

import com.meetingai.entity.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long> {

    // All tasks for a meeting
    List<TaskEntity> findByMeetingId(Long meetingId);

    // HITL review queue - sorted by lowest confidence first
    List<TaskEntity> findByStatusOrderByConfidenceAsc(String status);

    // Count pending review tasks (for badge on UI)
    long countByStatus(String status);

    // All open (pending) tasks - for digest
    List<TaskEntity> findByStatusOrderByPriorityAscDueDateAsc(String status);

    // Analytics - top assignees
    @Query("SELECT t.assignee, COUNT(t), SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) " +
           "FROM TaskEntity t WHERE t.assignee IS NOT NULL AND t.assignee != '' GROUP BY t.assignee ORDER BY COUNT(t) DESC")
    List<Object[]> findTopAssignees();

    // All failed email notifications
    List<TaskEntity> findByEmailFailed(boolean emailFailed);

    // All failed slack notifications
    List<TaskEntity> findBySlackFailed(boolean slackFailed);
}

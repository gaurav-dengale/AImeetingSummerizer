package com.meetingai.service;

import com.meetingai.entity.AppSettingEntity;
import com.meetingai.entity.MeetingEntity;
import com.meetingai.entity.TaskEntity;
import com.meetingai.repository.AppSettingRepository;
import com.meetingai.repository.MeetingRepository;
import com.meetingai.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * DatabaseService � thin service wrapping JPA repositories.
 * Spring Data JPA auto-generates SQL from method names.
 * Covers features: #1 #2 #3 #6 #9 #11 #12 #13 #14 #16
 */
@Service
@Transactional
public class DatabaseService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseService.class);

    private final MeetingRepository meetingRepo;
    private final TaskRepository taskRepo;
    private final AppSettingRepository settingRepo;

    public DatabaseService(MeetingRepository meetingRepo,
                           TaskRepository taskRepo,
                           AppSettingRepository settingRepo) {
        this.meetingRepo = meetingRepo;
        this.taskRepo    = taskRepo;
        this.settingRepo = settingRepo;
    }

    // -- Meetings ---------------------------------------------------------------

    public MeetingEntity saveMeeting(String meetingId, String title, String summary,
                                     String source, int segmentCount) {
        MeetingEntity m = meetingRepo.findByMeetingId(meetingId)
                .orElse(new MeetingEntity());
        m.setMeetingId(meetingId);
        m.setTitle((title != null && !title.isBlank()) ? title
                : "Meeting " + Instant.now().toString().substring(0, 10));
        m.setSummary(summary);
        m.setSource(source);
        m.setSegmentCount(segmentCount);
        return meetingRepo.save(m);
    }

    @Transactional(readOnly = true)
    public List<MeetingEntity> listMeetings() {
        // Auto-query: findAllByOrderByCreatedAtDesc()
        return meetingRepo.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<MeetingEntity> getMeeting(Long id) {
        return meetingRepo.findById(id);
    }

    public void deleteMeeting(Long id) {
        meetingRepo.deleteById(id);
    }

    // -- Tasks -----------------------------------------------------------------

    public TaskEntity saveTask(MeetingEntity meeting, String assignee, String task,
                               String dueDate, String status, String priority, int confidence,
                               boolean emailSent, boolean slackSent) {
        TaskEntity t = new TaskEntity();
        t.setMeeting(meeting);
        t.setAssignee(assignee);
        t.setTask(task);
        t.setDueDate(dueDate);
        t.setStatus(status);
        t.setPriority(priority);
        t.setConfidence(confidence);
        t.setEmailSent(emailSent);
        t.setSlackSent(slackSent);
        return taskRepo.save(t);
    }

    @Transactional(readOnly = true)
    public List<TaskEntity> getTasksForMeeting(Long meetingId) {
        return taskRepo.findByMeetingId(meetingId);
    }

    // HITL review queue (#8 Human-in-the-loop)
    @Transactional(readOnly = true)
    public List<TaskEntity> getPendingReviewTasks() {
        // Auto-query: findByStatusOrderByConfidenceAsc("pending_review")
        return taskRepo.findByStatusOrderByConfidenceAsc("pending_review");
    }

    @Transactional(readOnly = true)
    public long countPendingReview() {
        // Auto-query: countByStatus("pending_review")
        return taskRepo.countByStatus("pending_review");
    }

    public void updateTaskStatus(Long taskId, String status) {
        taskRepo.findById(taskId).ifPresent(t -> {
            t.setStatus(status);
            taskRepo.save(t);
        });
    }

    public void markEmailResult(Long taskId, boolean sent) {
        taskRepo.findById(taskId).ifPresent(t -> {
            t.setEmailSent(sent);
            t.setEmailFailed(!sent);
            if (!sent) t.setEmailRetryCount(t.getEmailRetryCount() + 1);
            taskRepo.save(t);
        });
    }

    public void markSlackResult(Long taskId, boolean sent) {
        taskRepo.findById(taskId).ifPresent(t -> {
            t.setSlackSent(sent);
            t.setSlackFailed(!sent);
            if (!sent) t.setSlackRetryCount(t.getSlackRetryCount() + 1);
            taskRepo.save(t);
        });
    }

    public Optional<TaskEntity> getTask(Long taskId) {
        return taskRepo.findById(taskId);
    }

    public void updateTaskFields(Long taskId, String assignee, String task, String dueDate) {
        taskRepo.findById(taskId).ifPresent(t -> {
            t.setAssignee(assignee);
            t.setTask(task);
            t.setDueDate(dueDate);
            taskRepo.save(t);
        });
    }

    /** Cross-meeting task linking (#13) */
    public void linkTasks(Long fromTaskId, Long toTaskId, String linkType) {
        taskRepo.findById(fromTaskId).ifPresent(from ->
            taskRepo.findById(toTaskId).ifPresent(to -> {
                from.setLinkedTask(to);
                from.setLinkType(linkType);
                taskRepo.save(from);
            })
        );
    }

    // Open tasks for digest (#6)
    @Transactional(readOnly = true)
    public List<TaskEntity> getAllOpenTasks() {
        return taskRepo.findByStatusOrderByPriorityAscDueDateAsc("pending");
    }

    // Tasks with failed notifications (for retry UI #3)
    @Transactional(readOnly = true)
    public List<TaskEntity> getFailedEmailTasks() {
        return taskRepo.findByEmailFailed(true);
    }

    @Transactional(readOnly = true)
    public List<TaskEntity> getFailedSlackTasks() {
        return taskRepo.findBySlackFailed(true);
    }

    // -- Analytics (#11) --------------------------------------------------------

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalytics() {
        Map<String, Object> a = new LinkedHashMap<>();
        long total = taskRepo.count();
        long done  = taskRepo.countByStatus("done");
        a.put("total_tasks",      total);
        a.put("done_tasks",       done);
        a.put("completion_rate",  total > 0 ? Math.round(done * 100.0 / total) : 0);
        a.put("total_meetings",   meetingRepo.count());
        a.put("pending_review",   countPendingReview());

        // Top assignees � raw JPQL query result
        List<Map<String, Object>> assignees = new ArrayList<>();
        for (Object[] row : taskRepo.findTopAssignees()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("assignee", row[0]);
            entry.put("total",    row[1]);
            entry.put("done",     row[2]);
            assignees.add(entry);
        }
        a.put("top_assignees", assignees);
        return a;
    }

    // -- Settings (#9 DB-backed settings) --------------------------------------

    public void saveSetting(String key, String value) {
        AppSettingEntity s = settingRepo.findById(key)
                .orElse(new AppSettingEntity(key, value));
        s.setValue(value);
        settingRepo.save(s);
    }

    @Transactional(readOnly = true)
    public Optional<String> getSetting(String key) {
        return settingRepo.findById(key).map(AppSettingEntity::getValue);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getAllSettings() {
        Map<String, String> result = new LinkedHashMap<>();
        settingRepo.findAll().forEach(s -> result.put(s.getKey(), s.getValue()));
        return result;
    }
}

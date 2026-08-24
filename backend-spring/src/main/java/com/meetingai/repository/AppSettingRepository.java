package com.meetingai.repository;

import com.meetingai.entity.AppSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppSettingRepository extends JpaRepository<AppSettingEntity, String> {
    // findById(key) is inherited from JpaRepository
    // findAll() gives all settings
}

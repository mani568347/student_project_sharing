package com.studentproject.sharing.repository;

import com.studentproject.sharing.model.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserId(Long userId);
    Optional<Project> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT p FROM Project p JOIN p.user u WHERE " +
           "(:query IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.id = :categoryId) AND " +
           "(:tag IS NULL OR :tag MEMBER OF p.tags)")
    List<Project> searchProjects(String query, Long categoryId, String tag);

    @Query("SELECT p FROM Project p JOIN p.user u WHERE " +
           "(:query IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.id = :categoryId) AND " +
           "(:tag IS NULL OR :tag MEMBER OF p.tags)")
    Page<Project> searchProjects(String query, Long categoryId, String tag, Pageable pageable);

    List<Project> findByUserUsername(String username);

    @Query("SELECT p FROM Project p ORDER BY p.downloadCount DESC")
    List<Project> findTopByOrderByDownloadCountDesc(@Param("limit") int limit);

    @Query("SELECT p FROM Project p WHERE p.openToCollaboration = true ORDER BY p.createdAt DESC")
    List<Project> findTopByOpenToCollaborationTrueOrderByCreatedAtDesc(@Param("limit") int limit);
}
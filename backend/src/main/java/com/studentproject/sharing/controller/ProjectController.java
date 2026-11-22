package com.studentproject.sharing.controller;

import com.studentproject.sharing.payload.ProjectRequest;
import com.studentproject.sharing.payload.ProjectResponse;
import com.studentproject.sharing.payload.MessageResponse;
import com.studentproject.sharing.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    @Autowired
    private ProjectService projectService;

    private Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @GetMapping
    public ResponseEntity<Page<ProjectResponse>> getProjects(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ?
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProjectResponse> projects = projectService.getProjects(query, category, tag, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/list")
    public ResponseEntity<java.util.List<ProjectResponse>> getProjectsList(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String tag) {
        return ResponseEntity.ok(projectService.getProjectsList(query, category, tag));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PostMapping(consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestPart(value = "project", required = false) ProjectRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestBody(required = false) ProjectRequest bodyRequest) {
        // Handle both multipart/form-data (with "project" part) and application/json (body)
        ProjectRequest projectRequest = request != null ? request : bodyRequest;
        String filename = null;
        if (file != null && !file.isEmpty()) {
            filename = projectService.storeFile(file);
        }
        ProjectResponse response = projectService.createProject(projectRequest, getAuthentication(), filename);
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestPart(value = "project", required = false) ProjectRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestBody(required = false) ProjectRequest bodyRequest) {
        // Handle both multipart/form-data (with "project" part) and application/json (body)
        ProjectRequest projectRequest = request != null ? request : bodyRequest;
        String filename = null;
        if (file != null && !file.isEmpty()) {
            filename = projectService.storeFile(file);
        }
        ProjectResponse response = projectService.updateProject(id, projectRequest, getAuthentication(), filename);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id, getAuthentication());
        return ResponseEntity.ok(new MessageResponse("Project deleted successfully"));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<ProjectResponse>> getTrendingProjects(
            @RequestParam(defaultValue = "3") int limit) {
        return ResponseEntity.ok(projectService.getTrendingProjects(limit));
    }

    @GetMapping("/collaboration")
    public ResponseEntity<List<ProjectResponse>> getCollaborationProjects(
            @RequestParam(defaultValue = "3") int limit) {
        return ResponseEntity.ok(projectService.getCollaborationProjects(limit));
    }
}
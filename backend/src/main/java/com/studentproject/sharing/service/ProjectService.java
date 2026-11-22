package com.studentproject.sharing.service;

import com.studentproject.sharing.exception.ResourceNotFoundException;
import com.studentproject.sharing.exception.UnauthorizedException;
import com.studentproject.sharing.model.Category;
import com.studentproject.sharing.model.Project;
import com.studentproject.sharing.model.User;
import com.studentproject.sharing.payload.ProjectRequest;
import com.studentproject.sharing.payload.ProjectResponse;
import com.studentproject.sharing.repository.CategoryRepository;
import com.studentproject.sharing.repository.ProjectRepository;
import com.studentproject.sharing.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class ProjectService {
    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileStorageService fileStorageService;

    public ProjectResponse createProject(ProjectRequest request, Authentication authentication, String filename) {
        User user = getCurrentUser(authentication);
        Category category = categoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new RuntimeException("Category not found"));
        Project project = new Project();
        project.setTitle(request.getTitle());
        project.setDescription(request.getDescription());
        project.setUser(user);
        project.setCategory(category);
        project.setTags(request.getTags() != null ? request.getTags() : Set.of());
        project.setRepoUrl(request.getRepoUrl());
        project.setDemoUrl(request.getDemoUrl() != null && request.getDemoUrl().startsWith("http") ? request.getDemoUrl() : null);
        if (filename != null) {
            project.setFilePath(filename);
        }
        project = projectRepository.save(project);
        return toResponse(project);
    }

    public Page<ProjectResponse> getProjects(String query, Long categoryId, String tag, Pageable pageable) {
        Page<Project> projects = projectRepository.searchProjects(query, categoryId, tag, pageable);
        return projects.map(this::toResponse);
    }

    public List<ProjectResponse> getProjectsList(String query, Long categoryId, String tag) {
        List<Project> projects = projectRepository.searchProjects(query, categoryId, tag);
        return projects.stream().map(this::toResponse).toList();
    }

    public ProjectResponse getProjectById(Long id) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return toResponse(project);
    }

    public ProjectResponse updateProject(Long id, ProjectRequest request, Authentication authentication, String filename) {
        User user = getCurrentUser(authentication);
        Project project = projectRepository.findByIdAndUserId(id, user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Project not found or access denied"));
        Category category = categoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new RuntimeException("Category not found"));
        project.setTitle(request.getTitle());
        project.setDescription(request.getDescription());
        project.setCategory(category);
        project.setTags(request.getTags() != null ? request.getTags() : Set.of());
        project.setRepoUrl(request.getRepoUrl());
        project.setDemoUrl(request.getDemoUrl() != null && request.getDemoUrl().startsWith("http") ? request.getDemoUrl() : null);
        if (filename != null) {
            project.setFilePath(filename);
        }
        project = projectRepository.save(project);
        return toResponse(project);
    }

    public void deleteProject(Long id, Authentication authentication) {
        User user = getCurrentUser(authentication);
        Project project = projectRepository.findByIdAndUserId(id, user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Project not found or access denied"));
        projectRepository.delete(project);
    }

    public String storeFile(MultipartFile file) {
        return fileStorageService.storeFile(file);
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Unauthorized");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
            project.getId(),
            project.getTitle(),
            project.getDescription(),
            project.getUser().getId(),
            project.getUser().getUsername(),
            project.getCategory() != null ? project.getCategory().getId() : null,
            project.getCategory() != null ? project.getCategory().getName() : null,
            project.getFilePath(),
            project.getRepoUrl(),
            project.getDemoUrl(),
            project.getTags(),
            project.getCreatedAt(),
            project.getUpdatedAt()
        );
    }

    public List<ProjectResponse> getTrendingProjects(int limit) {
        List<Project> projects = projectRepository.findTopByOrderByDownloadCountDesc(limit);
        return projects.stream().map(this::toResponse).toList();
    }

    public List<ProjectResponse> getCollaborationProjects(int limit) {
        List<Project> projects = projectRepository.findTopByOpenToCollaborationTrueOrderByCreatedAtDesc(limit);
        return projects.stream().map(this::toResponse).toList();
    }
}
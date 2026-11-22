package com.studentproject.sharing;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String obtainAuthToken(String username, String password) throws Exception {
        String requestBody = String.format("""
            {
                "username": "%s",
                "password": "%s"
            }
            """, username, password);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    @Test
    void getProjects_ReturnsList() throws Exception {
        mockMvc.perform(get("/api/projects")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    void getProjects_FiltersByCategory() throws Exception {
        mockMvc.perform(get("/api/projects")
                .param("category", "1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Weather Dashboard"));
    }

    @Test
    void getProjects_FiltersByQuery() throws Exception {
        mockMvc.perform(get("/api/projects")
                .param("query", "Weather")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Weather Dashboard"));
    }

    @Test
    void getProjects_EmptyResultForNonMatchingQuery() throws Exception {
        mockMvc.perform(get("/api/projects")
                .param("query", "NonExistentProject")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    void createProject_Authorized_Success() throws Exception {
        String token = obtainAuthToken("student", "password123");

        String requestBody = """
            {
                "title": "New Project",
                "description": "A new test project",
                "repoUrl": "https://github.com/example/new-project",
                "categoryId": 1,
                "tags": ["Java", "Spring"]
            }
            """;

        mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Project"))
                .andExpect(jsonPath("$.description").value("A new test project"))
                .andExpect(jsonPath("$.repoUrl").value("https://github.com/example/new-project"))
                .andExpect(jsonPath("$.categoryId").value(1))
                .andExpect(jsonPath("$.tags").exists());
    }

    @Test
    void createProject_WithoutToken_ReturnsUnauthorized() throws Exception {
        String requestBody = """
            {
                "title": "New Project",
                "description": "A new test project",
                "repoUrl": "https://github.com/example/new-project",
                "categoryId": 1
            }
            """;

        mockMvc.perform(post("/api/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createProject_WithInvalidToken_ReturnsUnauthorized() throws Exception {
        String requestBody = """
            {
                "title": "New Project",
                "description": "A new test project",
                "repoUrl": "https://github.com/example/new-project",
                "categoryId": 1
            }
            """;

        mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer invalid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteProject_AuthorizedOwner_Success() throws Exception {
        String token = obtainAuthToken("student", "password123");

        // First create a project
        String createRequest = """
            {
                "title": "Project to Delete",
                "description": "This will be deleted",
                "repoUrl": "https://github.com/example/delete-me",
                "categoryId": 1
            }
            """;

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createRequest))
                .andExpect(status().isOk())
                .andReturn();

        String createResponse = createResult.getResponse().getContentAsString();
        Long projectId = objectMapper.readTree(createResponse).get("id").asLong();

        // Now delete the project
        mockMvc.perform(delete("/api/projects/" + projectId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Project deleted successfully"));
    }

    @Test
    void deleteProject_WithoutToken_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/projects/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteProject_InvalidToken_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/projects/1")
                .header("Authorization", "Bearer invalid-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteProject_NonExistentProject_ReturnsNotFound() throws Exception {
        String token = obtainAuthToken("student", "password123");

        mockMvc.perform(delete("/api/projects/99999")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void getProjectById_ReturnsProject() throws Exception {
        mockMvc.perform(get("/api/projects/1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Weather Dashboard"));
    }

    @Test
    void getProjectById_NonExistent_ReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/projects/99999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
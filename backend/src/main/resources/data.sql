-- BCrypt hash for 'password123'
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('student', 'student@example.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'John Doe', 'STUDENT');

INSERT INTO categories (name, description) VALUES
('Web Development', 'Projects related to web applications'),
('Mobile Apps', 'Android and iOS projects'),
('AI/ML', 'Artificial Intelligence and Machine Learning'),
('Data Science', 'Data analysis and visualization projects'),
('Cloud/DevOps', 'Infrastructure and cloud solutions');

INSERT INTO projects (title, description, repo_url, category_id, user_id) VALUES
('Weather Dashboard', 'A real-time weather tracking app', 'https://github.com/example/weather', 1, 1),
('Stock Predictor', 'Predicting stock prices using LSTM', 'https://github.com/example/stock-ai', 3, 1);

INSERT INTO project_tags (project_id, tag_name) VALUES
(1, 'React'), (1, 'API'),
(2, 'Python'), (2, 'AI');

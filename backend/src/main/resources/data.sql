-- BCrypt hash for 'password123'
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('student', 'student@example.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'John Doe', 'STUDENT');

INSERT INTO categories (name, description) VALUES
('Web Development', 'Projects related to web applications'),
('Mobile Apps', 'Android and iOS projects'),
('AI/ML', 'Artificial Intelligence and Machine Learning'),
('Data Science', 'Data analysis and visualization projects'),
('Cloud/DevOps', 'Infrastructure and cloud solutions');

INSERT INTO projects (title, description, repo_url, category_id, user_id, download_count, open_to_collaboration) VALUES
('Weather Dashboard', 'A real-time weather tracking app with live API integration', 'https://github.com/example/weather', 1, 1, 245, true),
('Stock Predictor', 'Predicting stock prices using LSTM neural networks', 'https://github.com/example/stock-ai', 3, 1, 189, true),
('Task Manager Pro', 'Full-stack task management with drag-and-drop', 'https://github.com/example/task-manager', 1, 1, 156, true),
('E-commerce API', 'RESTful API for online store with payments', 'https://github.com/example/ecommerce', 1, 1, 98, false),
('ML Image Classifier', 'Image classification with TensorFlow.js', 'https://github.com/example/ml-classifier', 3, 1, 312, true),
('Chat Application', 'Real-time chat with WebSocket and rooms', 'https://github.com/example/chat-app', 1, 1, 87, true),
('Portfolio Generator', 'Auto-generate dev portfolios from GitHub', 'https://github.com/example/portfolio', 1, 1, 203, true),
('DevOps Dashboard', 'Monitor CI/CD pipelines and deployments', 'https://github.com/example/devops', 5, 1, 67, false);

INSERT INTO project_tags (project_id, tag_name) VALUES
(1, 'React'), (1, 'API'), (1, 'Tailwind'),
(2, 'Python'), (2, 'AI'), (2, 'LSTM'),
(3, 'React'), (3, 'Node.js'), (3, 'MongoDB'),
(4, 'Spring Boot'), (4, 'PostgreSQL'), (4, 'Stripe'),
(5, 'TensorFlow'), (5, 'JavaScript'), (5, 'ML'),
(6, 'WebSocket'), (6, 'React'), (6, 'Node.js'),
(7, 'GitHub API'), (7, 'React'), (7, 'Vercel'),
(8, 'Docker'), (8, 'Kubernetes'), (8, 'CI/CD');
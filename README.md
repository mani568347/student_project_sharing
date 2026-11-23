# 🎓 ProjectShare — Student Project Sharing Platform

A full-stack web platform where students can **discover, share, and collaborate** on academic and personal projects. Upload your work, browse by category, and connect with peers working on similar ideas.

---

## ✨ What's Inside

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML5 · CSS3 · JavaScript (ES6+) · Tailwind CSS · Font Awesome |
| **Backend** | Java 21 · Spring Boot 3.x · REST API · JWT Authentication |
| **Database** | MySQL — tables for Users, Projects, Categories, and Tags |
| **Deployment** | Docker → [Railway](https://railway.app/) (free tier) · [Live App](https://student-project-sharing-production.up.railway.app/) |
| **Security** | BCrypt password hashing · JWT tokens · CORS-aware security config |

### Core Features

- 🔐 **Sign up / Log in** with email, name, and password (JWT-based session)
- 📤 **Upload projects** with title, description, category, GitHub repo link, tags, and a downloadable ZIP/PDF file (≤ 10 MB)
- 🔍 **Search & filter** projects by keyword, category, or tag
- 👤 **User dashboard** — view your own projects, profile, and settings from the dropdown menu
- 🏷️ **Tag-based discovery** — every project is tagged for easy browsing
- 📊 **Stats at a glance** — live project count displayed on the home screen
- 📱 **Fully responsive** — works on desktop, tablet, and mobile without a framework

---

## 🚀 Quick Start (Local)

You need **Java 21**, **Maven**, and **MySQL** running locally.

```bash
# Clone the repo
git clone https://github.com/<your-username>/<repo-name>.git
cd student_project_sharing/backend

# Build the JAR (skip if you want to use the pre-built app.jar in the root)
mvn clean package -DskipTests

# Start the backend (defaults to :8084)
java -jar target/student-project-sharing-*.jar

# Open the frontend in any browser
open frontend/index.html   # macOS / Linux
start frontend\index.html  # Windows
```

The backend seeds one test user and five categories on first run:

| Email | Password | Role |
|-------|----------|------|
| `student@example.com` | `password123` | STUDENT |

### Configuration

All runtime values are driven by environment variables. The default `application.properties` falls back gracefully for local dev; on Railway they come from the dashboard.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8084` | HTTP port (Railway assigns its own at runtime) |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/student_project_sharing` | MySQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `root` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | *(see below)* | DB password |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Schema migration mode |
| `JAVA_TOOL_OPTIONS` | `-Xms128m -Xmx320m` | Memory caps for Railway free tier |

> ⚠️ Change `jwt.secret` before deploying to production — the current value is hard-coded for development only.

---

## 🐳 Docker

The root `Dockerfile` runs the pre-built `app.jar` directly — no build step inside the container. This matches the Railway deployment pipeline exactly.

```bash
docker build -t projectshare .
docker run -p 8084:8084 \
  -e SPRING_DATASOURCE_URL=jdbc:mysql://host.docker.internal:3306/student_project_sharing \
  -e SPRING_DATASOURCE_USERNAME=root \
  -e SPRING_DATASOURCE_PASSWORD=your_password \
  projectshare
```

---

## 🚂 Deploy to Railway

Everything you need is already in the repo. Railway auto-detects the `Dockerfile`.

1. **Sign up** at [railway.app](https://railway.app)
2. Click **New → Project → Deploy from GitHub repo** and select this repository
3. Add these environment variables in Railway's dashboard (**Settings → Variables**):

   | Variable | Value |
   |----------|-------|
   | `PORT` | `8084` |
   | `SPRING_DATASOURCE_URL` | Your MySQL connection string |
   | `SPRING_DATASOURCE_USERNAME` | DB username |
   | `SPRING_DATASOURCE_PASSWORD` | DB password |
   | `JAVA_TOOL_OPTIONS` | `-Xms128m -Xmx320m -XX:+UseSerialGC` |

4. Push any commit — Railway rebuilds automatically.

---

## 📁 Repository Layout

```
├── frontend/                  # Static single-page app
│   ├── index.html             # Entry point
│   ├── app.js                 # All client-side logic
│   └── styles.css             # Custom theme overrides
├── backend/
│   ├── pom.xml                # Maven dependencies
│   └── src/main/
│       ├── java/com/studentproject/sharing/
│       │   ├── controller/    # REST endpoints
│       │   ├── model/         # JPA entities
│       │   ├── repository/    # Spring Data JPA repos
│       │   ├── service/       # Business logic
│       │   ├── security/      # JWT filter + auth config
│       │   ├── exception/     # Global error handling
│       │   └── payload/       # DTOs (request/response)
│       └── resources/
│           ├── application.properties
│           ├── schema.sql     # Table definitions
│           └── data.sql       # Seed data (runs once)
├── Dockerfile                 # Production image (JRE-only)
├── render.yaml                # Render service spec
├── app.jar                    # Pre-built Spring Boot artifact
└── docs/                      # Additional documentation
```

---

## 🔑 API Endpoints (REST)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/register` | Create account | No |
| `POST` | `/api/auth/login` | Get JWT token | No |
| `GET`  | `/api/projects/list` | Browse all projects | No |
| `GET`  | `/api/projects/{id}` | View project detail | No |
| `POST` | `/api/projects` | Upload a new project | Yes |
| `DELETE` | `/api/projects/{id}` | Remove your project | Yes |
| `GET`  | `/api/categories` | List all categories | No |
| `GET`  | `/api/files/{path}` | Download uploaded file | No |

Full request/response schemas live in the `payload/` package.

---

## 🛡️ Security Notes

- Passwords are hashed with **BCrypt** via Spring Security's `PasswordEncoder`.
- JWT tokens expire after **24 hours** (`jwt.expirationMs = 86400000`).
- File uploads are limited to **.zip, .pdf, .tar, .gz, .rar** at **10 MB max**.
- The front-end makes no direct DB calls — every action goes through the authenticated REST layer.
- `spring.jpa.open-in-view=false` prevents lazy-load leaks outside the request scope.

---

## 🤝 Contributing

Pull requests are welcome. For meaningful changes, please open an issue first so we can discuss the approach.

1. Fork the repo
2. Create your branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for the student community.*

# Expense Tracker AI

A professional, full-stack personal finance application with AI-powered transactional classification and predictive analytics. This project demonstrates an asynchronous inference pipeline integrated with a Spring Boot backend, a React frontend, and PostgreSQL persistence for an auditable financial ledger.

Table of contents

- About
- Key features
- Architecture overview
- Tech stack
- API reference
- Database schema & seeding
- Local development
- Environment variables
- Contributing
- License

About

Expense Tracker AI is designed to automate categorization and storage of personal expenses using an LLM-based inference engine. It supports conversational queries against transaction history and provides rolling analytics to assist budgeting and forecasting.

Key features

- Debounced client-side transaction parsing (850ms) to reduce API calls
- LLM-driven expense classification with dynamic category creation
- Contextual chat interface for natural-language queries over transactional data
- Rolling analytics and time-series trend summaries for proactive insights
- Defensive data validation and transactional integrity at the persistence layer

Architecture overview

Client (React)
- Collects user input and debounces inference requests (850ms)
- Sends asynchronous JSON payloads to the backend

Application service (Spring Boot)
- REST controllers for expense management and AI orchestration
- Stateless JWT-based authentication filter
- LLM inference service that suggests categories and conversational responses
- Persistence via Spring Data JPA / Hibernate

Persistence (PostgreSQL)
- Normalized relational schema for categories and expenses
- Referential integrity and transaction isolation for consistent writes

Simple data flow (high level)

[User input] --(850ms debounce)--> [Client POST /api/ai/classify] --> [Spring Boot REST Controller] --> [LLM inference] --> [JPA persistence] --> [Postgres]

Tech stack

- Backend: Java 17, Spring Boot, Spring Web MVC, Spring Data JPA, Hibernate
- Frontend: React (Vite), React Router, Tailwind CSS, shadcn/ui, Lucide icons
- Database: PostgreSQL
- Auth: JWT-based stateless authentication

API reference

1) Expense Management

- GET /api/expenses?userId={id}
  - Description: Returns all transactions for the specified user.
  - Response: 200 OK, JSON array of expense objects

- POST /api/expenses
  - Description: Create a transaction record
  - Example payload:

```json
{
  "description": "Uber ride to office",
  "amount": 230.00,
  "date": "2026-05-23",
  "notes": "Heavy rain, autos were unavailable",
  "categoryId": 4,
  "userId": 1
}
```

- DELETE /api/expenses/{id}
  - Description: Deletes a transaction (subject to referential integrity checks)

2) AI & Analytics

- POST /api/ai/classify
  - Description: Classifies a raw description and suggests a category
  - Request example: {"description": "Cult fit annual gym membership"}
  - Response example: {"suggestedCategory": "Fitness & Gym", "isNewCategory": true}

- POST /api/ai/chat
  - Description: Conversational queries against transactional snapshots (returns natural language insights)

- GET /api/analytics/summary/{userId}
  - Description: Returns a 30-day rolling transactional summary and distribution metrics

API usage examples (curl)

Classify text:

```bash
curl -X POST http://localhost:8080/api/ai/classify \
  -H 'Content-Type: application/json' \
  -d '{"description":"Starbucks coffee"}'
```

Create expense:

```bash
curl -X POST http://localhost:8080/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"description":"Starbucks Coffee & Croissant","amount":4.20,"date":"2026-05-24","notes":"Coding session at the cafe","categoryId":3,"userId":1}'
```

Database schema & seeding

Use the SQL below to create the minimal schema and seed sample data for local testing.

```sql
-- Categories
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id INT NOT NULL
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  user_id INT NOT NULL
);

INSERT INTO categories (id, name, user_id) VALUES
(1, 'Shopping', 1),
(2, 'Entertainment', 1),
(3, 'Food & Dining', 1),
(4, 'Travel & Transport', 1);

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

INSERT INTO expenses (description, amount, date, notes, category_id, user_id) VALUES
('Swiggy - Dinner with friends', 840.00, '2026-05-22', 'Ordered pizzas', 3, 1),
('Uber ride to office', 230.00, '2026-05-23', 'Heavy rain, autos were unavailable', 4, 1),
('Monthly Netflix Subscription', 649.00, '2026-05-23', 'Premium 4K plan', 2, 1),
('Starbucks Coffee & Croissant', 420.00, '2026-05-24', 'Coding session at the cafe', 3, 1),
('Zudio - Weekend shopping haul', 1850.00, '2026-05-24', 'Bought a couple of t-shirts', 1, 1);
```

Local development

Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL (local or cloud)
- Maven (project includes wrapper ./mvnw)

Environment variables

Create a .env or set environment variables for local development (or edit application.properties for Spring Boot):

- SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/expense_tracker
- SPRING_DATASOURCE_USERNAME=your_db_user
- SPRING_DATASOURCE_PASSWORD=your_db_password
- JWT_SECRET=your_jwt_secret

Run backend

```bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
# Backend will be available at http://localhost:8080
```

Run frontend

```bash
cd frontend
npm install
npm run dev
# Frontend dev server typically at http://localhost:5173
```

Notes

- The project expects the database to be reachable and the schema applied before creating expenses.
- The AI endpoints require the inference engine configuration (LLM provider/API keys) to be present in application configuration.

Contributing

Contributions are welcome. Please open an issue to discuss changes or submit a pull request with a clear description of your change, the motivation, and any relevant tests.

License

Specify a license in LICENSE (MIT recommended if you want permissive open source).

---

If you'd like, I can:
- Add badges (build, license, coverage)
- Add example Postman collection or OpenAPI/Swagger spec
- Expand the API reference with all models and response schemas


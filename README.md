# AI-Powered Financial Ledger & Predictive Analytics Engine

An enterprise-grade, full-stack personal finance application engineered to automate transactional ledger tracking through real-time asynchronous AI inference pipelines. This architecture cleanly decouples high-latency machine learning tasks from core transactional CRUD processes, utilizing intelligent data pipelines, reactive UI state hydration, and relational analytical forecasting models.

---

## 🚀 System Architecture & Core Capabilities

* **Asynchronous AI Inference Pipeline:** Implemented an optimized 850ms debounced transaction parser inside the client-side execution context. This minimizes API network overhead by stream-dispatching text inputs to a backend LLM orchestration tier for real-time contextual category classifications.
* **Dynamic Relational Seeding:** Designed an on-the-fly table-seeding protocol. When the AI engine isolates an out-of-vocabulary category token, the platform exposes a secure, single-action database insertion layer to create, register, and update categorical relational entities instantaneously.
* **Context-Aware Conversational Interface:** Integrated a secure natural language financial assistant that interfaces directly with underlying transactional tables, enabling end-users to query historical ledger allocations using unstructured language queries.
* **Predictive Analytical Modeling:** Utilizes rolling database aggregations and time-series historical trend vectors via optimized relational query routines to generate proactive budget forecasts and anomalous variance alerts.
* **Data Sanitization & Defensive Guards:** Engineered structural client-side error boundaries paired with strict transactional database constraints to intercept, sanitize, and isolate non-deterministic LLM text payloads before network persistence.

---

## 🏗️ System Architecture & Data Flow

+---------------------------------------------------------------------------------------+
|                                     CLIENT LAYER                                      |
|                                                                                       |
|   [ User Text Input ] ----( 850ms Debounce )----> [ Axios Async Post Ingress ]        |
+-------------------------------------------------------------|-------------------------+
|
JSON Request Payload
|
v
+---------------------------------------------------------------------------------------+
|                                APPLICATION SERVICE LAYER                              |
|                                                                                       |
|   [ Spring Boot REST Controller ] <------------------------> [ JWT Auth Filter ]      |
|                 |                                                                     |
|                 v                                                                     |
|   [ LLM Inference Engine ]                                                            |
|                 |                                                                     |
|                 v                                                                     |
|   [ Spring Data JPA Layer ]                                                           |
+-----------------|---------------------------------------------------------------------+
|
Object-Relational Mapping (Hibernate)
|
v
+---------------------------------------------------------------------------------------+
|                                  DATA PERSISTENCE LAYER                               |
|                                                                                       |
|   [ PostgreSQL Database ] <---> ( Cascade Referential Integrity & Transaction Locks ) |
+---------------------------------------------------------------------------------------+


1. **Ingress:** The user provides an unformatted description string into the input interface (e.g., *"Swiggy dinner with friends"*).
2. **Debounce Optimization:** Client logic stalls execution for 850ms to prevent database connection pooling saturation and network spamming, then executes an asynchronous POST request.
3. **Contextual Analysis:** The Spring Boot backend processes the input through an internal inference layer to match the string against existing transactional categories or fallback options.
4. **Data Validation:** System intercepts raw output strings, verifying data structure matching before pushing properties to the application state matrix.
5. **Dynamic Persistence:** Confirming suggestions initiates a transactional sequence in PostgreSQL, updating the table architecture and refreshing the reactive view models seamlessly.

---

## 🛠️ Technology Stack & Engineering Primitives

### Backend Ecosystem
* **Core Runtime:** Java 17, Spring Boot, Spring Web MVC
* **Persistence Layer:** Spring Data JPA, Hibernate ORM
* **Security & Context:** Stateless JWT (JSON Web Tokens) Authorization Architecture

### Frontend Architecture
* **Client Core:** React.js, Vite Build System, React Router DOM
* **UI Interface Layout:** Tailwind CSS, shadcn/ui components, Lucide Core Icons
* **Asynchronous Notifications:** Sonner Toast notification context manager

### Relational Database
* **Engine:** PostgreSQL
* **Data Integrity:** Cascade referential constraints, database indexing for transactional velocity, and transactional isolation layers.

---

## 📡 Core API Specification Endpoints

### 1. Expense Management Controller
* **`GET /api/expenses?userId={id}`**
  * **Description:** Fetches all transactions linked to an authorized user ID.
  * **Response:** `200 OK` with an array of transactional ledger objects.
* **`POST /api/expenses`**
  * **Description:** Persists a new transactional record to the database ledger.
  * **Payload:** ```json
    {
      "description": "Uber ride to office",
      "amount": 230.00,
      "date": "2026-05-23",
      "notes": "Heavy rain, autos were unavailable",
      "categoryId": 4,
      "userId": 1
    }
    ```
* **`DELETE /api/expenses/{id}`**
  * **Description:** Evaluates transactional integrity cascades and drops records.

### 2. AI & Analytical Orchestration Controller
* **`POST /api/ai/classify`**
  * **Description:** Takes a raw text string payload and yields a predicted classification key string.
  * **Payload:** `{"description": "Cult fit annual gym membership"}`
  * **Response:** `{"suggestedCategory": "Fitness & Gym", "isNewCategory": true}`
* **`POST /api/ai/chat`**
  * **Description:** Processes conversational context queries against the transactional database snapshot and yields real-time natural language insights.
* **`GET /api/analytics/summary/{userId}`**
  * **Description:** Queries the historical database layer to compile a rolling 30-day transactional trend summary and distribution metrics.

---

## 💾 Database Schema Initialization

To seed your localized PostgreSQL instance with high-fidelity, production-grade test data to validate analytical graphs and conversational query tracking, execute the following relational scripts:

```sql
-- Ensure clean slate schema setup
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;

-- Create Category Master Schema
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id INT NOT NULL
);

-- Create Transactional Ledger Schema
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    user_id INT NOT NULL
);

-- Seed standard relational category entities
INSERT INTO categories (id, name, user_id) VALUES 
(1, 'Shopping', 1), 
(2, 'Entertainment', 1), 
(3, 'Food & Dining', 1), 
(4, 'Travel & Transport', 1);

-- Reset table sequence to prevent conflict IDs
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Seed transactional ledger data with human-like metadata
INSERT INTO expenses (description, amount, date, notes, category_id, user_id) VALUES
('Swiggy - Dinner with friends', 840.00, '2026-05-22', 'Ordered pizzas', 3, 1),
('Uber ride to office', 230.00, '2026-05-23', 'Heavy rain, autos were unavailable', 4, 1),
('Monthly Netflix Subscription', 649.00, '2026-05-23', 'Premium 4K plan', 2, 1),
('Starbucks Coffee & Croissant', 420.00, '2026-05-24', 'Coding session at the cafe', 3, 1),
('Zudio - Weekend shopping haul', 1850.00, '2026-05-24', 'Bought a couple of t-shirts', 1, 1);
⚙️ Local Deployment & Environment Setup
System Prerequisites
Java Development Kit (JDK) 17 or higher

Node.js (v18+) & npm package manager

Local or cloud-hosted instance of PostgreSQL

1. Database Configuration
Initialize a local target schema instance named expense_tracker. Configure your active application profile inside backend/src/main/resources/application.properties:

Properties
spring.datasource.url=jdbc:postgresql://localhost:5432/expense_tracker
spring.datasource.username=YOUR_DATABASE_USERNAME
spring.datasource.password=YOUR_DATABASE_PASSWORD
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
2. Backend Bootstrapping
Navigate to your repository backend root folder and build the application archive:

Bash
cd backend
./mvnw clean install
./mvnw spring-boot:run
The server framework interface will boot and bind securely to port http://localhost:8080.

3. Frontend Instantiation
Navigate to the client asset root directory, install dependencies, and run the development server:

Bash
cd frontend
npm install
npm run dev
The compilation layer will parse source map modules and instantiate the local dev node interface at http://localhost:5173.

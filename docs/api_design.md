# Brain Backend API Design & Documentation

Welcome to the **Brain Backend** API specification. This backend powers the Personal Second Brain & Execution System, running on Cloudflare Workers, Hono, and Cloudflare D1.

---

## 1. Base URLs

- **Development:** `https://dev.mohakapoor.in` (or Worker fallback: `https://brain-backend-dev.mohak-kapoor-v.workers.dev`)
- **Local Dev:** `http://localhost:8787`
- **Route Prefix:** All endpoints are grouped under `/api_brain`

---

## 2. Authentication Overview

The API uses **Database-backed Session Cookies**:
- **Cookie Name:** `session_id`
- **Cookie Properties:** `HttpOnly`, `Secure`, `SameSite: Lax`, `Path: /`
- **Session Duration:** Configured via environment variable `SESSION_TTL_SECONDS` (default: 7 days / 604,800s).
- **Session Security:**
  - The cookie only contains an unguessable opaque UUID (`crypto.randomUUID()`).
  - No user data or sensitive information is stored in the cookie.
  - Actual session state lives in Cloudflare D1 `sessions` table.
  - **Single-Device Policy:** Logging in invalidates any existing sessions for that user.
  - **Automatic Housekeeping:** Expired sessions are purged from D1 on login.

---

## 3. Base Endpoints

### 3.1 Root Info
Returns basic API identifier information.

- **Method:** `GET`
- **Path:** `/api_brain`
- **Auth Required:** No

#### Response (`200 OK`)
```json
{
  "name": "Brain API"
}
```

---

### 3.2 Health Check
Used by uptime monitoring, CI/CD smoke tests, and container/infrastructure health probes.

- **Method:** `GET`
- **Path:** `/api_brain/health`
- **Auth Required:** No

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "timestamp": "2026-10-10T15:30:00.000Z"
}
```

---

## 4. Authentication Endpoints

### 4.1 Register User
Creates a new user account and immediately issues an active session cookie (auto-login).

- **Method:** `POST`
- **Path:** `/api_brain/auth/register`
- **Auth Required:** No (Requires secret `inviteCode`)

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "username": "mohak",
  "password": "mypassword123",
  "inviteCode": "your-secret-invite-code"
}
```

#### Validation Rules:
- `username`: Minimum 3 characters, stored lowercase & trimmed.
- `password`: Minimum 6 characters (hashed with `bcrypt-ts`, 10 salt rounds).
- `inviteCode`: Must match `c.env.INVITE_CODE`.

#### Success Response (`201 Created`)
**Headers:**
```http
Set-Cookie: session_id=<uuid>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```
**Body:**
```json
{
  "message": "Registered and logged in successfully",
  "user": {
    "id": 1,
    "username": "mohak"
  }
}
```

#### Error Responses:
- `400 Bad Request`: Missing fields or validation failure.
  ```json
  { "error": "Username, password, and invite code are required" }
  ```
- `403 Forbidden`: Invalid invite code.
  ```json
  { "error": "Invalid invite code" }
  ```
- `409 Conflict`: Username already registered.
  ```json
  { "error": "Username already taken" }
  ```

---

### 4.2 Login
Authenticates an existing user, terminates any prior sessions for that user (single-device policy), and issues a fresh session cookie.

- **Method:** `POST`
- **Path:** `/api_brain/auth/login`
- **Auth Required:** No

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "username": "mohak",
  "password": "mypassword123"
}
```

#### Success Response (`200 OK`)
**Headers:**
```http
Set-Cookie: session_id=<uuid>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```
**Body:**
```json
{
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "username": "mohak"
  }
}
```

#### Error Responses:
- `400 Bad Request`: Missing username or password.
  ```json
  { "error": "Username and password are required" }
  ```
- `401 Unauthorized`: Invalid credentials (generic to prevent username enumeration).
  ```json
  { "error": "Invalid username or password" }
  ```

---

### 4.3 Logout
Invalidates the session in Cloudflare D1 and clears the browser cookie.

- **Method:** `POST`
- **Path:** `/api_brain/auth/logout`
- **Auth Required:** Optional (reads `session_id` cookie if present)

#### Request Headers
```http
Cookie: session_id=<uuid>
```

#### Success Response (`200 OK`)
**Headers:**
```http
Set-Cookie: session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0
```
**Body:**
```json
{
  "message": "Logged out successfully"
}
```

### 4.4 Get Current User (Me)
Verifies the active session cookie and returns the logged-in user's profile. Used by frontend on app load/refresh to restore auth state.

- **Method:** `GET`
- **Path:** `/api_brain/auth/me`
- **Auth Required:** Yes (`session_id` cookie)

#### Request Headers
```http
Cookie: session_id=<uuid>
```

#### Success Response (`200 OK`)
```json
{
  "user": {
    "id": 1,
    "username": "mohak",
    "createdAt": 1772395200
  }
}
```

#### Error Response:
- `401 Unauthorized`: Session cookie missing, invalid, or expired.
  ```json
  { "error": "Unauthorized" }
  ```

---

## 5. Tasks Endpoints (Protected by Auth Middleware)

All task endpoints require a valid `session_id` cookie. Requests without an active session automatically receive `401 Unauthorized`.

### 5.1 Create Task
Creates a new task associated with the logged-in user.

- **Method:** `POST`
- **Path:** `/api_brain/tasks`
- **Auth Required:** Yes (`session_id` cookie)

#### Request Headers
```http
Content-Type: application/json
Cookie: session_id=<uuid>
```

#### Request Body
```json
{
  "title": "Build the frontend"
}
```

#### Validation Rules:
- `title`: Must be a non-empty string, maximum 500 characters.

#### Success Response (`201 Created`)
```json
{
  "message": "Task created successfully",
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "Build the frontend",
    "completed": 0,
    "created_at": 1772395200,
    "updated_at": 1772395200,
    "completed_at": null
  }
}
```

#### Error Responses:
- `400 Bad Request`: Missing or invalid `title`.
  ```json
  { "error": "Task title is required" }
  ```
- `401 Unauthorized`: Not logged in.
  ```json
  { "error": "Unauthorized" }
  ```

---

### 5.2 List Tasks
Fetches all tasks belonging to the authenticated user. Incomplete tasks are strictly ordered above completed tasks; within each category, newest tasks appear first.

- **Method:** `GET`
- **Path:** `/api_brain/tasks`
- **Auth Required:** Yes (`session_id` cookie)

#### Request Headers
```http
Cookie: session_id=<uuid>
```

#### Success Response (`200 OK`)
```json
{
  "tasks": [
    {
      "id": 2,
      "user_id": 1,
      "title": "Unfinished task",
      "completed": 0,
      "created_at": 1772395300,
      "updated_at": 1772395300,
      "completed_at": null
    },
    {
      "id": 1,
      "user_id": 1,
      "title": "Completed task",
      "completed": 1,
      "created_at": 1772395200,
      "updated_at": 1772395250,
      "completed_at": 1772395250
    }
  ]
}
```

#### Error Response:
- `401 Unauthorized`: Not logged in.
  ```json
  { "error": "Unauthorized" }
  ```

---

### 5.3 Update Task
Modifies a task's title and/or toggles its completion state. Only the owner of the task can update it.

- **Method:** `PATCH`
- **Path:** `/api_brain/tasks/:id`
- **Auth Required:** Yes (`session_id` cookie)

#### Request Headers
```http
Content-Type: application/json
Cookie: session_id=<uuid>
```

#### Request Body (All fields optional, at least one required)
```json
{
  "title": "Updated title",
  "completed": true
}
```

#### Behavior:
- Setting `completed: true` sets `completed = 1` and `completed_at = <unix_timestamp>`.
- Setting `completed: false` resets `completed = 0` and clears `completed_at = null`.
- `updated_at` is always refreshed to current timestamp.

#### Success Response (`200 OK`)
```json
{
  "message": "Task updated successfully",
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "Updated title",
    "completed": 1,
    "created_at": 1772395200,
    "updated_at": 1772395600,
    "completed_at": 1772395600
  }
}
```

#### Error Responses:
- `400 Bad Request`: Invalid ID or invalid field payload.
- `401 Unauthorized`: Not logged in.
- `404 Not Found`: Task does not exist or belongs to another user.

---

### Remaining Planned Task Endpoints
- `DELETE /api_brain/tasks/:id` — Delete a task.




---

## 6. Testing via Postman / cURL

### Register via cURL:
```bash
curl -X POST https://dev.mohakapoor.in/api_brain/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mohak","password":"mypassword123","inviteCode":"your-invite-code"}' \
  -c cookies.txt
```

### Login via cURL:
```bash
curl -X POST https://dev.mohakapoor.in/api_brain/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mohak","password":"mypassword123"}' \
  -c cookies.txt
```

### Logout via cURL:
```bash
curl -X POST https://dev.mohakapoor.in/api_brain/auth/logout \
  -b cookies.txt
```

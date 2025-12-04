# API Documentation

## Overview

This service provides a message queue processing system with retry logic, exponential backoff, and dead-letter queue handling.

## Interactive Documentation

**Swagger/OpenAPI UI**: [http://localhost:3011/api/docs](http://localhost:3011/api/docs)

The complete API documentation with interactive testing is available via Swagger UI. This includes:
- Request/response schemas
- Parameter validation
- Live API testing
- Authentication details

## Base URL

```
http://localhost:3011
```

## Quick Reference

### Queue Operations

#### 1. Add Message to Queue

Add a new message to the processing queue.

**Endpoint:** `POST /api/queue/message`

**Request Body:**

```json
{
  "id": "unique-message-id",
  "channel": "http|email|internal",
  "destination": "target-url-or-address",
  "data": {
    // Channel-specific data
  },
  "metadata": {
    // Optional metadata
  }
}
```

**Channel-Specific Data:**

**HTTP Channel:**
```json
{
  "id": "msg-001",
  "channel": "http",
  "destination": "https://api.example.com/webhook",
  "data": {
    "orderId": "12345",
    "status": "completed"
  }
}
```

**Email Channel:**
```json
{
  "id": "msg-002",
  "channel": "email",
  "destination": "recipient@example.com",
  "data": {
    "from": "sender@example.com",
    "subject": "Subject Line",
    "text": "Plain text content",
    "html": "<p>HTML content</p>"
  }
}
```

**Internal Channel:**
```json
{
  "id": "msg-003",
  "channel": "internal",
  "destination": "service-name",
  "data": {
    "action": "process",
    "payload": {}
  }
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "1",
  "message": "Message added to queue successfully"
}
```

---

### Admin & Monitoring Operations

#### 2. Get Queue Statistics

Retrieve statistics for both main and dead-letter queues.

**Endpoint:** `GET /api/admin/queue/stats`

**Response:**

```json
{
  "mainQueue": {
    "waiting": 5,
    "active": 2,
    "completed": 100,
    "failed": 3,
    "delayed": 1
  },
  "deadLetterQueue": {
    "waiting": 2,
    "active": 0,
    "completed": 5
  }
}
```

---

#### 3. Get Jobs

Retrieve jobs by state with pagination.

**Endpoint:** `GET /api/admin/queue/jobs`

**Query Parameters:**
- `state` (optional): `waiting`, `active`, `completed`, `failed`, `delayed` (default: `waiting`)
- `start` (optional): Start index (default: 0)
- `end` (optional): End index (default: 10)

**Example:** `GET /api/admin/queue/jobs?state=failed&start=0&end=5`

**Response:**

```json
[
  {
    "id": "1",
    "name": "deliver",
    "data": {
      "message": {
        "id": "msg-001",
        "channel": "http",
        "destination": "https://example.com",
        "data": {}
      },
      "attemptCount": 3,
      "lastError": "Connection timeout"
    },
    "attemptsMade": 3,
    "processedOn": 1733146800000,
    "finishedOn": null,
    "failedReason": "Connection timeout"
  }
]
```

---

#### 4. Get Dead-Letter Queue Jobs

Retrieve jobs from the dead-letter queue.

**Endpoint:** `GET /api/admin/queue/dead-letter`

**Query Parameters:**
- `start` (optional): Start index (default: 0)
- `end` (optional): End index (default: 10)

**Response:**

```json
[
  {
    "id": "2",
    "name": "dead_letter",
    "data": {
      "message": {
        "id": "msg-002",
        "channel": "http",
        "destination": "https://invalid.com"
      },
      "attemptCount": 5,
      "lastError": "Max retries exceeded"
    },
    "attemptsMade": 5,
    "timestamp": 1733147400000
  }
]
```

---

#### 5. Get Job by ID

Retrieve detailed information about a specific job.

**Endpoint:** `GET /api/admin/queue/jobs/{jobId}`

**Response:**

```json
{
  "id": "1",
  "name": "deliver",
  "data": {
    "message": {},
    "attemptCount": 2
  },
  "attemptsMade": 2,
  "processedOn": 1733146800000,
  "finishedOn": null,
  "failedReason": "Timeout",
  "stacktrace": ["Error: Timeout", "at ..."]
}
```

---

#### 6. Requeue Failed Job

Move a job from the dead-letter queue back to the main queue for reprocessing.

**Endpoint:** `POST /api/admin/queue/requeue/{jobId}`

**Response:**

```json
{
  "success": true,
  "message": "Job 1 requeued successfully"
}
```

---

## Retry Configuration

The service uses exponential backoff for retries:

- **Max Retry Attempts:** 5
- **Initial Delay:** 1 second
- **Backoff Strategy:** Exponential (2^attempt)

**Retry Schedule:**
1. Attempt 1: Immediate
2. Attempt 2: +1 second
3. Attempt 3: +2 seconds
4. Attempt 4: +4 seconds
5. Attempt 5: +8 seconds
6. After 5 attempts: Moved to dead-letter queue

---

## Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Failed to add message to queue"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Job not found"
}
```

---

## Monitoring

### Logs

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Log Format

```
2025-12-02T12:00:00.000Z [MessageProcessor] info: Successfully delivered message msg-001
2025-12-02T12:01:00.000Z [MessageProcessor] error: Failed to deliver message msg-002: Connection timeout
```

---

## Docker Services

The application runs with the following services:

- **app**: NestJS application (port 3011)
- **redis**: Redis for queue storage (port 6379)
- **postgres**: PostgreSQL database (port 5432)
- **mailpit**: Email testing service (web UI: port 8025, SMTP: port 1025)

---

## Testing

### Using curl

```bash
# Add a message
curl -X POST http://localhost:3011/api/queue/message \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "channel": "internal",
    "destination": "test-service",
    "data": {"test": "data"}
  }'

# Get queue stats
curl http://localhost:3011/api/admin/queue/stats

# Get failed jobs
curl "http://localhost:3011/api/admin/queue/jobs?state=failed"
```

### Using the provided HTTP file

Use the `examples/test-queue.http` file with REST Client extensions in VS Code or similar tools.

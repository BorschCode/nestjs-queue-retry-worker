# Message Queue Processing Service (Recommended Approach)

[![NestJS](https://img.shields.io/badge/NestJS-Framework-red.svg)]()
[![Docker Image](https://img.shields.io/badge/Docker-ready-blue?logo=docker)]()
[![Node.js CI](https://img.shields.io/badge/node-18+-brightgreen.svg)]()
[![RabbitMQ Queue](https://img.shields.io/badge/RabbitMQ-queue-orange?logo=rabbitmq)]()
[![Mailpit](https://img.shields.io/badge/Mailpit-email%20testing-green)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)]()
---

## Task Description

Implement a **NestJS-based message processing service** that handles messages returned to the queue due to delivery failures.  
The service attempts to deliver each message to the designated channel (HTTP webhook, internal service, email, etc.) using **retry logic with backoff**.  
After exceeding the maximum retry limit, the message is moved to a **dead-letter queue**, and an error-handling workflow is triggered (logging, alerting, manual review).

---

## Technical Guidelines

### Queue & Retry Mechanics

- Use **@nestjs/bull**, **@nestjs/bullmq**, or **BullMQ** with Redis.
- Create job types:
  - `deliver`
  - `retry`
  - `dead_letter`
- Configure:
  - exponential backoff  
  - max retry attempts  
  - optional custom backoff strategy  

---

### Delivery Channels

Define a delivery interface:

```ts
interface DeliveryChannel {
  deliver(message: MessagePayload): Promise<void>;
}
````

Supported channels:

* HTTP webhook (`@nestjs/axios`)
* Internal service / microservice call
* Email transport

Use a **factory resolver** to provide the correct channel at runtime.

---

### Logging

Use `winston` or a shared logger abstraction such as `@situation-center/logger`.

Log:

* successful deliveries
* failures
* retry attempts
* dead-letter transitions

---

### Administration Endpoints

Include admin API endpoints:

* view queue contents
* requeue failed messages from dead-letter
* view job status and history

---

### Testing

* Unit tests:

    * mock Redis
    * mock delivery channels
* Integration tests:

    * in-memory Redis
    * or testcontainers-based Redis

---

## Acceptance Criteria

* Failed jobs automatically retry using exponential backoff.
* After N failed attempts, the message is moved to **dead-letter**.
* Logs (and optionally DB records) include the failure reason.
* Admin endpoints for queue inspection and manual requeue exist.
* Unit and integration test coverage for:

    * retry logic
    * dead-letter transitions
    * delivery behavior

---

## Example Tests

### Unit Test

* Simulate a delivery failure (e.g., HTTP timeout).
* Check that the job moves to retry with backoff.
* Validate incremented attempt counters.

### Integration Test

* Use BullMQ + in-memory Redis / testcontainers.
* Trigger multiple consecutive failures.
* Assert that message ends up in dead-letter after max attempts.
* Validate logs and metadata.

---

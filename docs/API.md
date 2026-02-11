# API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints except `/health` and `/auth/*` require JWT authentication.

```http
Authorization: Bearer <token>
```

### Development Authentication

```http
POST /api/v1/auth/dev/login
Content-Type: application/json

{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": { "id": "uuid", "email": "user@example.com", "role": "STUDENT" }
}
```

## Endpoints

### Health Check

```http
GET /health
```

### Surveys

#### Get All Surveys

```http
GET /api/v1/surveys
```

**Response:**
```json
{
  "surveys": [
    {
      "id": "uuid",
      "title": "Course Selection",
      "type": "PICK_N",
      "status": "ACTIVE",
      "config": {},
      "options": [
        { "id": "uuid", "title": "Option 1", "value": "opt1" }
      ]
    }
  ]
}
```

### Participation

#### Check Eligibility

```http
GET /api/v1/participation/releases/:releaseId/eligibility
```

**Response:**
```json
{
  "eligible": true,
  "decision": "ALLOW",
  "requirements": [],
  "reason": null
}
```

#### Start Participation

```http
POST /api/v1/participation/releases/:releaseId/participate
```

**Response:**
```json
{
  "participation": {
    "id": "uuid",
    "status": "VIEWING",
    "started_at": "2024-01-15T10:00:00Z"
  },
  "nextAction": {
    "type": "VIEW_OPTIONS",
    "availableActions": ["HOLD_SEAT"]
  }
}
```

#### Hold Seat

```http
POST /api/v1/participation/:participationId/hold
Content-Type: application/json

{
  "optionId": "uuid"
}
```

**Response:**
```json
{
  "participation": { "id": "uuid", "status": "HOLD_ACTIVE" },
  "hold": {
    "id": "uuid",
    "expires_at": "2024-01-15T10:15:00Z"
  },
  "nextAction": {
    "type": "SUBMIT_SURVEY",
    "expiresAt": "2024-01-15T10:15:00Z"
  }
}
```

#### Submit Survey

```http
POST /api/v1/participation/:participationId/submit
Content-Type: application/json

{
  "selections": [
    { "optionId": "uuid", "rank": 1 }
  ],
  "answers": {}
}
```

**Response:**
```json
{
  "participation": {
    "id": "uuid",
    "status": "SUBMITTED",
    "submitted_at": "2024-01-15T10:14:00Z"
  },
  "nextAction": {
    "type": "WAIT",
    "message": "Submission received. Awaiting processing."
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "No seats available",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Invalid or missing token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `CAPACITY_EXCEEDED` - No seats available
- `INVALID_STATE_TRANSITION` - Invalid state change
- `HOLD_EXPIRED` - Seat hold has expired

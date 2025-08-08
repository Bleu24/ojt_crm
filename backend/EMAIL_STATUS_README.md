# Email Status Functionality

This document describes the new email functionality for sending recruitment status updates to candidates.

## Available Email Types

### 1. Pass Initial Interview
**Endpoint:** `POST /api/email/pass-initial`

Send a congratulatory email to candidates who passed their initial interview.

**Request Body:**
```json
{
  "recruitId": "string (required)",
  "message": "string (optional) - Custom message/notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pass initial email sent successfully",
  "emailResult": {
    "messageId": "string",
    "recipient": "candidate@email.com"
  }
}
```

### 2. Fail Initial Interview
**Endpoint:** `POST /api/email/fail-initial`

Send a polite rejection email to candidates who didn't pass the initial interview.

**Request Body:**
```json
{
  "recruitId": "string (required)",
  "message": "string (optional) - Custom message/notes"
}
```

### 3. Hire Decision
**Endpoint:** `POST /api/email/hire`

Send a job offer email to successful candidates.

**Request Body:**
```json
{
  "recruitId": "string (required)",
  "jobDetails": {
    "startDate": "string (optional) - e.g., '2025-09-01'",
    "salary": "string (optional) - e.g., '$80,000'",
    "benefits": "string (optional) - e.g., 'Health, Dental, 401k'",
    "workLocation": "string (optional) - e.g., 'Remote'",
    "workArrangement": "string (optional) - e.g., 'Full-time'"
  }
}
```

### 4. Final Rejection
**Endpoint:** `POST /api/email/reject`

Send a final rejection email to candidates who didn't get hired.

**Request Body:**
```json
{
  "recruitId": "string (required)",
  "message": "string (optional) - Custom rejection reason"
}
```

## Additional Endpoints

### Get Email History
**Endpoint:** `GET /api/email/history/:recruitId`

Retrieve the email history for a specific recruit.

**Response:**
```json
{
  "success": true,
  "emailHistory": {
    "candidateName": "John Doe",
    "email": "john.doe@example.com",
    "lastEmailSent": "pass_initial",
    "lastEmailDate": "2025-08-08T10:30:00.000Z",
    "currentStatus": "active",
    "initialInterviewStatus": "passed",
    "finalInterviewStatus": "pending"
  }
}
```

## Automatic Status Updates

When emails are sent, the recruit's status is automatically updated in the database:

- **Pass Initial:** `initialInterviewStatus: 'passed'`
- **Fail Initial:** `initialInterviewStatus: 'failed'`, `status: 'rejected'`
- **Hire:** `status: 'hired'`, `finalInterviewStatus: 'passed'`
- **Reject:** `status: 'rejected'`, `finalInterviewStatus: 'failed'`

## Email Templates

### Pass Initial Email Features:
- ✅ Congratulatory tone
- 📋 Interview results summary
- 🚀 Next steps information
- 📞 Contact information

### Fail Initial Email Features:
- 🙏 Respectful tone
- 📋 Professional rejection message
- 💪 Encouragement section
- 🔗 Future opportunities mention

### Hire Email Features:
- 🎊 Celebration tone
- 📄 Job offer details
- ⏰ Response deadline
- 📋 Next steps for onboarding

### Reject Email Features:
- 🙏 Professional tone
- 📋 Respectful rejection message
- 🌟 Stay connected section
- 🔗 Future opportunities

## Usage Examples

### Frontend Integration
```javascript
// Send pass initial email
const sendPassInitialEmail = async (recruitId) => {
  try {
    const response = await fetch('/api/email/pass-initial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recruitId: recruitId,
        message: 'Great performance in the technical interview!'
      })
    });
    
    const result = await response.json();
    console.log('Email sent:', result);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

// Send hire email with job details
const sendHireEmail = async (recruitId) => {
  try {
    const response = await fetch('/api/email/hire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recruitId: recruitId,
        jobDetails: {
          startDate: '2025-09-01',
          salary: '$85,000',
          benefits: 'Health, Dental, Vision, 401k',
          workLocation: 'San Francisco, CA',
          workArrangement: 'Hybrid (3 days in office)'
        }
      })
    });
    
    const result = await response.json();
    console.log('Hire email sent:', result);
  } catch (error) {
    console.error('Failed to send hire email:', error);
  }
};
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

Common error codes:
- `400` - Bad Request (missing required fields)
- `404` - Not Found (recruit not found)
- `500` - Internal Server Error (email service issues)

## Authentication

All email endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Testing

Run the email functionality tests:

```bash
npm test -- email-status.test.js
```

The test suite covers:
- ✅ Successful email sending
- ❌ Error handling
- 🔍 Edge cases
- 📊 Database interactions
- 🚨 Email service failures

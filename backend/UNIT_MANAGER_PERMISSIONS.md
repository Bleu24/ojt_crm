# Unit Manager Permissions Summary

## ✅ What Unit Managers CAN Do:

### 1. **Create Recruits** ✅
- Unit managers can create new recruit records
- They can upload resume files via Cloudinary
- Route: `POST /api/recruits`

### 2. **View Upcoming Recruits** ✅ (Fixed)
Unit managers can see:
- Recruits assigned to them for final interviews
- Recruits assigned to their team members
- **ONLY "upcoming" recruits** with status:
  - `Applied`
  - `Pending` 
  - `Interviewed`
  - `Pending Final Interview`

**They CANNOT see:**
- `Hired` recruits (completed)
- `Rejected` recruits (completed)

### 3. **Schedule Final Interviews** ✅
- Can schedule final interviews for recruits assigned to them
- Route: `PUT /api/recruits/:id/schedule-final`

### 4. **Complete Final Interviews** ✅
- Can mark final interviews as complete
- Can decide to hire or reject candidates
- Route: `PUT /api/recruits/:id/complete-final`

### 5. **Update Recruit Information** ✅
- Can update recruit details
- Can replace resume files
- Route: `PUT /api/recruits/:id`

### 6. **View Team Recruits** ✅
- Separate endpoint to view all recruits assigned to team members
- Route: `GET /api/recruits/team`

## 🔒 What Unit Managers CANNOT Do:

### 1. **Schedule Initial Interviews** ❌
- Only `intern` and `staff` can schedule initial interviews
- This maintains the workflow: intern/staff → unit manager

### 2. **Complete Initial Interviews** ❌
- Only `intern` and `staff` can complete initial interviews
- This ensures proper workflow progression

### 3. **See All Recruits** ❌
- Unlike admins, unit managers only see recruits relevant to them
- No access to recruits from other teams/managers

## 📊 Query Logic for Unit Managers:

```javascript
// Unit managers see recruits that match ALL of these conditions:
query.$and = [
  {
    // Either assigned to them for final interview OR assigned to their team
    $or: [
      { finalInterviewAssignedTo: req.user.userId },
      { assignedTo: { $in: teamMemberIds } }
    ]
  },
  {
    // Only upcoming/active recruits (not completed)
    applicationStatus: { 
      $in: ['Applied', 'Pending', 'Interviewed', 'Pending Final Interview'] 
    }
  }
];
```

## 🎯 Workflow Summary:

1. **Intern/Staff** creates recruit
2. **Intern/Staff** schedules & completes initial interview
3. **Intern/Staff** assigns to **Unit Manager** for final interview
4. **Unit Manager** schedules & completes final interview
5. **Unit Manager** decides: Hire or Reject

This ensures proper separation of responsibilities and workflow control! ✅

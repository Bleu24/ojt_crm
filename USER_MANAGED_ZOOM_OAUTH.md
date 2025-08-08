# User-Managed Zoom OAuth System

## Overview

The CRM system now supports **user-managed Zoom OAuth**, allowing each user to connect their own Zoom account for hosting interview meetings. This eliminates the single point of failure that existed when all meetings depended on one person's Zoom credentials.

## Key Benefits

### ✅ Business Continuity
- **No Single Point of Failure**: Each user can host meetings from their own Zoom account
- **Independent Operation**: If one person leaves or has account issues, others can still host meetings
- **Scalable Solution**: Multiple users can host concurrent meetings without conflicts

### ✅ Better Meeting Management  
- **Personal Dashboard**: Meetings appear in the user's personal Zoom dashboard
- **Recording Access**: Users have direct access to their meeting recordings
- **Individual Settings**: Each user can apply their own Zoom preferences and settings

### ✅ Flexible Deployment
- **Backwards Compatible**: System falls back to Server-to-Server OAuth if user hasn't connected
- **Optional Connection**: Users can choose whether to connect their Zoom account
- **Seamless Integration**: No changes needed to existing meeting creation workflows

## How It Works

### 1. User Connection Process
1. Users navigate to **Account Settings** from the dashboard profile menu
2. Click **Connect Zoom** to initiate OAuth flow
3. Authorize the application in their Zoom account
4. System stores encrypted OAuth tokens securely

### 2. Meeting Creation Logic
When creating meetings, the system:
1. **First Choice**: Uses the interviewer's connected Zoom account (if available)
2. **Fallback**: Uses system-level Server-to-Server OAuth credentials
3. **Automatic Token Refresh**: Handles token expiration transparently

### 3. Token Management
- **Secure Storage**: Tokens encrypted in MongoDB
- **Auto-Refresh**: Expired tokens refreshed automatically
- **Clean Disconnection**: Users can disconnect anytime from settings

## Technical Implementation

### Database Schema Extensions
```javascript
// User Model additions
zoomAccessToken: String,     // Encrypted OAuth access token
zoomRefreshToken: String,    // Encrypted OAuth refresh token  
zoomTokenExpiry: Date,       // Token expiration timestamp
zoomUserId: String,          // Zoom user ID
zoomEmail: String,           // User's Zoom email address
zoomConnected: Boolean,      // Connection status flag
zoomConnectedAt: Date        // Connection timestamp
```

### API Endpoints
- `GET /api/zoom/connect` - Initiate OAuth flow
- `GET /api/zoom/callback` - Handle OAuth callback
- `GET /api/zoom/status` - Check connection status
- `POST /api/zoom/disconnect` - Disconnect account

### Meeting Creation API
```javascript
// Updated function signature
await createZoomMeeting(meetingData, schedulerUserId);
```

## Environment Variables

Add to your `.env` file:
```bash
# OAuth 2.0 App Credentials (for user-managed meetings)
ZOOM_CLIENT_ID=your_oauth_client_id
ZOOM_CLIENT_SECRET=your_oauth_client_secret
ZOOM_REDIRECT_URI=http://localhost:5000/api/zoom/callback

# Server-to-Server App Credentials (for fallback)
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_USER_ID=me
```

## Zoom App Configuration

### OAuth 2.0 App (Required for User Management)
1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Create **OAuth 2.0** app
3. Set redirect URI: `http://localhost:5000/api/zoom/callback`
4. Required scopes:
   - `meeting:write`
   - `meeting:read`
   - `user:read`

### Server-to-Server App (Optional Fallback)
1. Create **Server-to-Server OAuth** app
2. Required scopes:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `user:read:admin`

## User Experience

### For Interviewers
1. **First Time Setup**:
   - Navigate to Account Settings
   - Click "Connect Zoom"
   - Authorize in Zoom
   - See green "Connected" status

2. **Daily Usage**:
   - Schedule interviews normally
   - Meetings created in their Zoom account
   - Access recordings from Zoom dashboard

### For Administrators
1. **System Monitoring**:
   - Users can self-manage connections
   - Fallback ensures system reliability
   - No need for shared credentials

2. **Support**:
   - Users can disconnect/reconnect anytime
   - Clear status indicators
   - Comprehensive error handling

## Migration Strategy

### Phase 1: Dual System (Current)
- ✅ User-managed OAuth implemented
- ✅ Fallback to Server-to-Server OAuth
- ✅ All existing functionality preserved

### Phase 2: User Adoption
- Encourage users to connect personal accounts
- Monitor adoption rates
- Maintain fallback for reliability

### Phase 3: Full Migration (Optional)
- Eventually deprecate Server-to-Server fallback
- Require user connections for meeting hosting
- Enhanced security and individual accountability

## Troubleshooting

### Common Issues

**"Not connected to Zoom"**
- User needs to visit Account Settings
- Click "Connect Zoom" button
- Complete OAuth authorization

**"Failed to create meeting"** 
- Check if user's Zoom token expired
- System will attempt auto-refresh
- Falls back to system credentials if needed

**"Meetings not appearing in my Zoom"**
- Verify user connected their personal account
- Check connection status in Account Settings
- May be using system fallback credentials

### Debug Information
- Check browser console for OAuth errors
- Review server logs for token refresh attempts
- Verify environment variables are configured

## Security Considerations

### Data Protection
- OAuth tokens encrypted at rest
- Secure token refresh mechanisms
- Clean token removal on disconnection

### Access Control
- Users can only manage their own connections
- Proper authentication on all endpoints
- Audit trail for connection events

### Privacy
- Minimal Zoom data stored (ID, email only)
- Users control their own authorization
- No access to Zoom account settings

## Future Enhancements

### Planned Features
- **Meeting Analytics**: Track meeting usage per user
- **Bulk Operations**: Admin tools for managing connections
- **Integration Health**: Dashboard showing connection status
- **Advanced Settings**: Per-user meeting defaults

### Potential Integrations
- **Calendar Sync**: Auto-add to personal calendars
- **Notification System**: Alert for token expiration
- **Reporting**: Usage statistics and insights
- **SSO Integration**: Enterprise single sign-on support

---

## Quick Start Guide

### For Users
1. Login to CRM dashboard
2. Click profile → "Account Settings"
3. Click "Connect Zoom"
4. Authorize in Zoom
5. Start hosting meetings! 🎥

### For Developers
1. Set up OAuth 2.0 app in Zoom
2. Add `ZOOM_REDIRECT_URI` to environment
3. Deploy updates
4. Users can self-connect
5. Monitor adoption 📊

**Result**: Robust, scalable meeting system with no single points of failure! ✨

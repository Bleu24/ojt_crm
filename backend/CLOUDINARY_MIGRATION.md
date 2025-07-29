# Cloudinary Migration Guide

## Overview
This guide helps you migrate from local file storage to Cloudinary for better scalability and deployment compatibility.

## What Changed

### 1. File Storage Location
- **Before**: Files stored locally in `uploads/` directory
- **After**: Files stored on Cloudinary cloud service

### 2. Affected Components
- **NAP Reports** (`/controllers/napReport.controller.js`)
- **Recruit Resumes** (`/controllers/recruits.controller.js`)
- **Database Models** (added Cloudinary public IDs)

### 3. Database Schema Updates
- `Recruit.resumeCloudinaryId` - stores Cloudinary public ID for deletion
- `NAPReport.sourceFile.cloudinaryPublicId` - stores Cloudinary public ID

## Migration Scripts

### 1. Test Upload Script
Before running the full migration, test your Cloudinary setup:

```bash
npm run test:upload
```

This script will:
- Test Cloudinary connection
- Upload 2 sample files from each category
- Verify uploads work without modifying database

### 2. Full Migration Script
Migrate all existing files and update database records:

```bash
npm run migrate:cloudinary
```

This script will:
- Upload all files from `uploads/` to Cloudinary
- Update database records with new URLs
- Generate detailed migration report
- Handle errors gracefully

**Migration Results:**
- Creates `migration-results-{timestamp}.json` with detailed results
- Shows upload success/failure rates
- Lists all migrated files with their new URLs

### 3. Cleanup Script (Optional)
After confirming migration success, remove local files:

```bash
npm run cleanup:uploads -- --confirm
```

**⚠️ WARNING:** This permanently deletes local files! Only run after:
- Successful Cloudinary migration
- Thorough testing of new URLs
- Verification in Cloudinary dashboard

## Migration Process

### Step-by-Step Guide

1. **Setup Cloudinary Account**
   ```bash
   # Add to .env file
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_secret
   ```

2. **Test Connection**
   ```bash
   npm run test:upload
   ```

3. **Run Full Migration**
   ```bash
   npm run migrate:cloudinary
   ```

4. **Verify Results**
   - Check Cloudinary dashboard
   - Test file access in application
   - Review migration report JSON file

5. **Clean Up (Optional)**
   ```bash
   npm run cleanup:uploads -- --confirm
   ```

## File Organization in Cloudinary

### Folder Structure
```
crm/
├── nap-reports/     # PDF files for NAP reports
└── resumes/         # Resume files (PDF, DOC, DOCX)
```

### File Naming Convention
- NAP Reports: `nap-report-{timestamp}-{random}`
- Resumes: `resume-{timestamp}-{random}`

## Benefits of Migration

### 1. Deployment Ready
- No need to create upload directories on servers
- Works seamlessly with Heroku, Vercel, Railway, etc.

### 2. Scalability
- No storage limits on your server
- CDN delivery for faster file access
- Automatic backup and redundancy

### 3. File Management
- Automatic cleanup when records are deleted
- URL-based file access
- Built-in image optimization (if needed later)

## API Changes

### Upload Endpoints
All upload endpoints remain the same:
- `POST /api/nap-report/upload` - NAP report upload
- `POST /api/recruits` - Create recruit with resume
- `PUT /api/recruits/:id` - Update recruit with new resume

### Response Format
Files now return Cloudinary URLs instead of local paths:
```javascript
// Before
{
  "resumeUrl": "uploads/resumes/resume-123456.pdf"
}

// After
{
  "resumeUrl": "https://res.cloudinary.com/your-cloud/raw/upload/v123/crm/resumes/resume-123456.pdf"
}
```

## Cleanup Old Files

### Optional: Remove Local Upload Directory
After confirming Cloudinary works correctly:
```bash
rm -rf uploads/
```

### Update .gitignore
The `/uploads` entry in `.gitignore` can be removed since we're no longer using local storage.

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure Cloudinary environment variables are set correctly
   - Restart your server after adding environment variables

2. **File Upload Fails**
   - Check Cloudinary dashboard for error logs
   - Verify API credentials are correct
   - Check file size limits (10MB for NAP reports, 5MB for resumes)

3. **File URLs Not Working**
   - Ensure files are uploaded as `resource_type: 'raw'` for PDFs
   - Check if file exists in Cloudinary dashboard

### Debugging
Enable Cloudinary debug mode in development:
```javascript
// In utils/cloudinary.js, add:
if (process.env.NODE_ENV === 'development') {
  require('cloudinary').v2.config({
    // ... existing config
    secure: true,
    use_filename: true,
    unique_filename: false
  });
}
```

## Monitoring

### Cloudinary Dashboard
- Monitor usage and storage
- View upload activity
- Check for any failed uploads

### Backend Logs
- File upload confirmations
- Cloudinary public IDs logged
- Deletion confirmations

## Cost Considerations

### Free Tier Limits
- 25 credits/month (generous for most applications)
- Up to 25GB storage
- 25GB monthly bandwidth

### Monitoring Usage
- Check Cloudinary dashboard monthly
- Set up alerts for approaching limits
- Consider paid plans for production scaling

## Migration Complete ✅

Your CRM system now uses Cloudinary for all file storage:
- ✅ NAP Reports stored in Cloudinary
- ✅ Resume files stored in Cloudinary  
- ✅ Automatic file cleanup on record deletion
- ✅ Production deployment ready
- ✅ No more local storage dependencies

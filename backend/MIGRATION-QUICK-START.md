# Cloudinary Migration - Quick Start Guide

## 🚀 Migration Scripts Summary

Your CRM system now includes three migration scripts to help you transition from local file storage to Cloudinary:

### 1. `upload-test.js` - Test Cloudinary Setup
```bash
npm run test:upload
```
- **Purpose**: Verify Cloudinary credentials and connection
- **Safe**: Only uploads 2-4 test files, no database changes
- **When to use**: Before running full migration

### 2. `migrate-to-cloudinary.js` - Full Migration
```bash
npm run migrate:cloudinary
```
- **Purpose**: Migrate all existing files and update database
- **What it does**:
  - Uploads all NAP reports to `crm/nap-reports/` folder
  - Uploads all resumes to `crm/resumes/` folder  
  - Updates recruit records with new Cloudinary URLs
  - Generates detailed migration report
- **When to use**: After successful test upload

### 3. `cleanup-uploads.js` - Remove Local Files
```bash
npm run cleanup:uploads -- --confirm
```
- **Purpose**: Clean up local uploads/ directory after migration
- **Safety**: Creates backup before deletion
- **When to use**: After confirming migration success

## 📋 Migration Checklist

- [ ] 1. Set up Cloudinary account and get credentials
- [ ] 2. Add Cloudinary environment variables to `.env`
- [ ] 3. Run test upload: `npm run test:upload`
- [ ] 4. Verify test files in Cloudinary dashboard
- [ ] 5. Run full migration: `npm run migrate:cloudinary`
- [ ] 6. Review migration report JSON file
- [ ] 7. Test application with new Cloudinary URLs
- [ ] 8. (Optional) Clean up local files: `npm run cleanup:uploads -- --confirm`

## 🔧 Environment Variables Required

Add these to your `.env` file:
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## 📊 Current Status

✅ **Cloudinary Integration**: Complete  
✅ **Test Upload**: Successful (verified working)  
⏳ **Full Migration**: Ready to run  
⏳ **Database Updates**: Ready to run  

## 🎯 Next Steps

1. **Test Upload** (Already successful!)
2. **Run Full Migration** when ready
3. **Verify Everything Works**
4. **Clean Up Local Files** (optional)

Your system is now production-ready with cloud storage! 🎉

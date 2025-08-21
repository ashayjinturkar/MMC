# Backend & Database Connection Test

This directory contains comprehensive test files to verify that your backend server and MongoDB database are running and properly connected.

## Files

- **`test-connection.js`** - Main test script (Node.js)
- **`test-connection.bat`** - Windows batch file for easy execution
- **`test-connection.ps1`** - PowerShell script with better error handling

## What the Tests Check

### 1. Backend Connection Test
- ✅ Verifies if the backend server is running on port 5000
- ✅ Tests the `/api/test` endpoint
- ✅ Checks response time and status

### 2. Database Connection Test
- ✅ Tests MongoDB connection using the connection string
- ✅ Verifies connection state and database details
- ✅ Tests basic CRUD operations (Create, Read, Update, Delete)

### 3. API Endpoints Test
- ✅ Tests all major API endpoints:
  - Blogs API (`/api/blogs`)
  - Contact Submissions API (`/api/contact-submissions`)
  - Testimonials API (`/api/testimonials`)
  - Newsletter Subscribers API (`/api/newsletter/subscribers`)

### 4. Environment Variables Check
- ✅ Verifies required environment variables are set
- ✅ Shows optional environment variables status

### 5. System Resources Check
- ✅ Displays memory usage
- ✅ Shows Node.js version and platform info

## How to Run

### Option 1: Using the Batch File (Windows)
```bash
# Double-click the file or run from command prompt
test-connection.bat
```

### Option 2: Using PowerShell
```powershell
# Right-click and "Run with PowerShell" or run from PowerShell
.\test-connection.ps1
```

### Option 3: Direct Node.js Execution
```bash
# Navigate to backend directory first
cd backend

# Install dependencies if not already installed
npm install

# Run the test
node test-connection.js
```

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **Backend server running** on port 5000
3. **MongoDB connection** (local or cloud)
4. **Dependencies installed** (`npm install`)

## Expected Output

### Success Case
```
🚀 Starting Backend & Database Connection Tests...
============================================================

🔍 Testing Backend Connection...
✅ Backend is running and responding
   Status: 200
   Message: Backend is working!
   Timestamp: 2024-01-15T10:30:00.000Z

🗄️  Testing Database Connection...
✅ Database connection successful
   State: CONNECTED
   Host: cluster0.hkirdlo.mongodb.net
   Port: 27017
   Database: test

📊 Testing Database Operations...
✅ Document creation successful
✅ Document reading successful
✅ Document update successful
✅ Document deletion successful

🌐 Testing Backend API Endpoints...
✅ Blogs API: Working
   Status: 200
   Records: 0
✅ Contact Submissions API: Working
   Status: 200
   Records: 0
✅ Testimonials API: Working
   Status: 200
   Records: 0
✅ Newsletter Subscribers API: Working
   Status: 200
   Records: 0

🔧 Checking Environment Variables...
✅ MONGO_URI: Set
⚠️  PORT: Not set (optional)
⚠️  NODE_ENV: Not set (optional)
⚠️  BACKEND_URL: Not set (optional)

💻 Checking System Resources...
   Memory Usage:
     RSS: 45.23 MB
     Heap Total: 20.48 MB
     Heap Used: 15.67 MB
     External: 2.45 MB
   Node.js Version: v18.17.0
   Platform: win32
   Architecture: x64

📋 Test Summary
==================================================
✅ Backend: RUNNING
✅ Database: CONNECTED

🎉 All tests passed! Your backend and database are working correctly.

💡 Recommendations:
   1. Your application is ready to use!
   2. You can now test the frontend integration

🔌 Database connection closed
```

### Failure Case
```
🚀 Starting Backend & Database Connection Tests...
============================================================

🔍 Testing Backend Connection...
❌ Backend server is not running
   Please start the backend server with: npm run dev

🗄️  Testing Database Connection...
❌ Database network error
   Check if MongoDB is running and accessible

📋 Test Summary
==================================================
❌ Backend: NOT RUNNING
❌ Database: NOT CONNECTED

❌ Both backend and database are not working.
   Please check your setup and try again.

💡 Recommendations:
   1. Start backend server: cd backend && npm run dev
   2. Check MongoDB connection string in .env file
   3. Ensure MongoDB service is running
```

## Troubleshooting

### Backend Not Running
1. Navigate to the backend directory: `cd backend`
2. Start the server: `npm run dev`
3. Check if port 5000 is available
4. Verify no other process is using the port

### Database Connection Failed
1. Check your MongoDB connection string in `.env` file
2. Ensure MongoDB service is running (local) or accessible (cloud)
3. Verify network connectivity and firewall settings
4. Check if the database credentials are correct

### Dependencies Missing
1. Run `npm install` in the backend directory
2. Check if `package.json` has all required dependencies
3. Verify Node.js version compatibility

### Permission Issues (Windows)
1. Run PowerShell as Administrator
2. Check execution policy: `Get-ExecutionPolicy`
3. Set execution policy if needed: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Environment Variables

Create a `.env` file in the backend directory with:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000
```

## Exit Codes

- **0** - All tests passed successfully
- **1** - Some tests failed or encountered errors

## Integration

You can also import and use the test functions in other files:

```javascript
const { runAllTests } = require('./test-connection');

// Run tests programmatically
runAllTests().then(results => {
  console.log('Test results:', results);
});
```

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all prerequisites are met
3. Check the troubleshooting section above
4. Ensure your backend server and MongoDB are properly configured

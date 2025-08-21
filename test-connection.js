const mongoose = require('mongoose');
const axios = require('axios');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://madmarketingclub:im3pyoLHa1UJD0pg@mmc-cluster.hkirdlo.mongodb.net/?retryWrites=true&w=majority&appName=MMC-Cluster';

// Test results storage
const testResults = {
  backend: {},
  database: {},
  overall: 'PENDING'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to print colored output
function printResult(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Check if backend server is running
async function testBackendConnection() {
  printResult('\n🔍 Testing Backend Connection...', 'blue');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/test`, { timeout: 5000 });
    
    if (response.status === 200) {
      testResults.backend.status = 'RUNNING';
      testResults.backend.responseTime = response.headers['x-response-time'] || 'N/A';
      testResults.backend.data = response.data;
      printResult('✅ Backend is running and responding', 'green');
      printResult(`   Status: ${response.status}`, 'green');
      printResult(`   Message: ${response.data.message}`, 'green');
      printResult(`   Timestamp: ${response.data.timestamp}`, 'green');
    } else {
      testResults.backend.status = 'ERROR';
      testResults.backend.error = `Unexpected status: ${response.status}`;
      printResult('❌ Backend responded with unexpected status', 'red');
    }
  } catch (error) {
    testResults.backend.status = 'NOT_RUNNING';
    testResults.backend.error = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      printResult('❌ Backend server is not running', 'red');
      printResult('   Please start the backend server with: npm run dev', 'yellow');
    } else if (error.code === 'ENOTFOUND') {
      printResult('❌ Backend URL not found', 'red');
      printResult(`   Check if the backend is running on: ${BACKEND_URL}`, 'yellow');
    } else if (error.code === 'ETIMEDOUT') {
      printResult('❌ Backend connection timed out', 'red');
      printResult('   Server might be overloaded or network issues', 'yellow');
    } else {
      printResult('❌ Backend connection failed', 'red');
      printResult(`   Error: ${error.message}`, 'red');
    }
  }
}

// Test 2: Check database connection
async function testDatabaseConnection() {
  printResult('\n🗄️  Testing Database Connection...', 'blue');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    // Check connection state
    const connectionState = mongoose.connection.readyState;
    const stateNames = {
      0: 'DISCONNECTED',
      1: 'CONNECTED',
      2: 'CONNECTING',
      3: 'DISCONNECTING'
    };
    
    if (connectionState === 1) {
      testResults.database.status = 'CONNECTED';
      testResults.database.connectionState = stateNames[connectionState];
      testResults.database.host = mongoose.connection.host;
      testResults.database.port = mongoose.connection.port;
      testResults.database.name = mongoose.connection.name;
      
      printResult('✅ Database connection successful', 'green');
      printResult(`   State: ${stateNames[connectionState]}`, 'green');
      printResult(`   Host: ${mongoose.connection.host}`, 'green');
      printResult(`   Port: ${mongoose.connection.port}`, 'green');
      printResult(`   Database: ${mongoose.connection.name}`, 'green');
      
      // Test database operations
      await testDatabaseOperations();
      
    } else {
      testResults.database.status = 'CONNECTION_FAILED';
      testResults.database.error = `Connection state: ${stateNames[connectionState]}`;
      printResult('❌ Database connection failed', 'red');
      printResult(`   State: ${stateNames[connectionState]}`, 'red');
    }
    
  } catch (error) {
    testResults.database.status = 'ERROR';
    testResults.database.error = error.message;
    
    if (error.name === 'MongoNetworkError') {
      printResult('❌ Database network error', 'red');
      printResult('   Check if MongoDB is running and accessible', 'yellow');
    } else if (error.name === 'MongoServerSelectionError') {
      printResult('❌ Database server selection failed', 'red');
      printResult('   Check MongoDB connection string and network', 'yellow');
    } else if (error.name === 'MongoParseError') {
      printResult('❌ Invalid MongoDB connection string', 'red');
      printResult('   Check MONGO_URI environment variable', 'yellow');
    } else {
      printResult('❌ Database connection error', 'red');
      printResult(`   Error: ${error.message}`, 'red');
    }
  }
}

// Test 3: Test database operations
async function testDatabaseOperations() {
  printResult('\n📊 Testing Database Operations...', 'blue');
  
  try {
    // Test creating a test document
    const TestModel = mongoose.model('TestConnection', new mongoose.Schema({
      testField: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // Create test document
    const testDoc = new TestModel({ testField: 'connection_test' });
    await testDoc.save();
    printResult('✅ Document creation successful', 'green');
    
    // Test reading test document
    const readDoc = await TestModel.findById(testDoc._id);
    if (readDoc) {
      printResult('✅ Document reading successful', 'green');
    }
    
    // Test updating test document
    await TestModel.findByIdAndUpdate(testDoc._id, { testField: 'updated_test' });
    printResult('✅ Document update successful', 'green');
    
    // Test deleting test document
    await TestModel.findByIdAndDelete(testDoc._id);
    printResult('✅ Document deletion successful', 'green');
    
    // Clean up the test model
    delete mongoose.models.TestConnection;
    
    testResults.database.operations = 'SUCCESS';
    
  } catch (error) {
    testResults.database.operations = 'FAILED';
    testResults.database.operationsError = error.message;
    printResult('❌ Database operations failed', 'red');
    printResult(`   Error: ${error.message}`, 'red');
  }
}

// Test 4: Test backend API endpoints
async function testBackendEndpoints() {
  if (testResults.backend.status !== 'RUNNING') {
    printResult('\n⚠️  Skipping API endpoint tests - backend not running', 'yellow');
    return;
  }
  
  printResult('\n🌐 Testing Backend API Endpoints...', 'blue');
  
  const endpoints = [
    { name: 'Blogs API', path: '/api/blogs', method: 'GET' },
    { name: 'Contact Submissions API', path: '/api/contact-submissions', method: 'GET' },
    { name: 'Testimonials API', path: '/api/testimonials', method: 'GET' },
    { name: 'Newsletter Subscribers API', path: '/api/newsletter/subscribers', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, { timeout: 5000 });
      
      if (response.status === 200) {
        printResult(`✅ ${endpoint.name}: Working`, 'green');
        printResult(`   Status: ${response.status}`, 'green');
        if (Array.isArray(response.data)) {
          printResult(`   Records: ${response.data.length}`, 'green');
        }
      } else {
        printResult(`⚠️  ${endpoint.name}: Unexpected status ${response.status}`, 'yellow');
      }
    } catch (error) {
      if (error.response) {
        printResult(`❌ ${endpoint.name}: ${error.response.status} - ${error.response.statusText}`, 'red');
      } else {
        printResult(`❌ ${endpoint.name}: ${error.message}`, 'red');
      }
    }
  }
}

// Test 5: Check environment variables
function checkEnvironmentVariables() {
  printResult('\n🔧 Checking Environment Variables...', 'blue');
  
  const requiredVars = ['MONGO_URI'];
  const optionalVars = ['PORT', 'NODE_ENV', 'BACKEND_URL'];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      printResult(`✅ ${varName}: Set`, 'green');
    } else {
      printResult(`❌ ${varName}: Not set`, 'red');
      printResult('   This is required for database connection', 'yellow');
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      printResult(`✅ ${varName}: ${process.env[varName]}`, 'green');
    } else {
      printResult(`⚠️  ${varName}: Not set (optional)`, 'yellow');
    }
  }
}

// Test 6: Check system resources
function checkSystemResources() {
  printResult('\n💻 Checking System Resources...', 'blue');
  
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
  };
  
  printResult(`   Memory Usage:`, 'cyan');
  printResult(`     RSS: ${memUsageMB.rss} MB`, 'cyan');
  printResult(`     Heap Total: ${memUsageMB.heapTotal} MB`, 'cyan');
  printResult(`     Heap Used: ${memUsageMB.heapUsed} MB`, 'cyan');
  printResult(`     External: ${memUsageMB.external} MB`, 'cyan');
  
  printResult(`   Node.js Version: ${process.version}`, 'cyan');
  printResult(`   Platform: ${process.platform}`, 'cyan');
  printResult(`   Architecture: ${process.arch}`, 'cyan');
}

// Generate overall test result
function generateOverallResult() {
  printResult('\n📋 Test Summary', 'magenta');
  printResult('=' * 50, 'magenta');
  
  // Backend status
  if (testResults.backend.status === 'RUNNING') {
    printResult('✅ Backend: RUNNING', 'green');
  } else {
    printResult('❌ Backend: NOT RUNNING', 'red');
  }
  
  // Database status
  if (testResults.database.status === 'CONNECTED') {
    printResult('✅ Database: CONNECTED', 'green');
  } else {
    printResult('❌ Database: NOT CONNECTED', 'red');
  }
  
  // Overall status
  if (testResults.backend.status === 'RUNNING' && testResults.database.status === 'CONNECTED') {
    testResults.overall = 'SUCCESS';
    printResult('\n🎉 All tests passed! Your backend and database are working correctly.', 'green');
  } else if (testResults.backend.status === 'RUNNING' && testResults.database.status !== 'CONNECTED') {
    testResults.overall = 'PARTIAL';
    printResult('\n⚠️  Backend is running but database is not connected.', 'yellow');
    printResult('   Check your MongoDB connection and credentials.', 'yellow');
  } else if (testResults.backend.status !== 'RUNNING' && testResults.database.status === 'CONNECTED') {
    testResults.overall = 'PARTIAL';
    printResult('\n⚠️  Database is connected but backend is not running.', 'yellow');
    printResult('   Start your backend server with: npm run dev', 'yellow');
  } else {
    testResults.overall = 'FAILED';
    printResult('\n❌ Both backend and database are not working.', 'red');
    printResult('   Please check your setup and try again.', 'red');
  }
  
  // Recommendations
  printResult('\n💡 Recommendations:', 'cyan');
  if (testResults.backend.status !== 'RUNNING') {
    printResult('   1. Start backend server: cd backend && npm run dev', 'cyan');
  }
  if (testResults.database.status !== 'CONNECTED') {
    printResult('   2. Check MongoDB connection string in .env file', 'cyan');
    printResult('   3. Ensure MongoDB service is running', 'cyan');
  }
  if (testResults.overall === 'SUCCESS') {
    printResult('   1. Your application is ready to use!', 'cyan');
    printResult('   2. You can now test the frontend integration', 'cyan');
  }
}

// Main test function
async function runAllTests() {
  printResult('🚀 Starting Backend & Database Connection Tests', 'bright');
  printResult('=' * 60, 'bright');
  
  try {
    // Run all tests
    await testBackendConnection();
    await testDatabaseConnection();
    await testBackendEndpoints();
    checkEnvironmentVariables();
    checkSystemResources();
    
    // Generate summary
    generateOverallResult();
    
    // Return results for programmatic use
    return testResults;
    
  } catch (error) {
    printResult('\n💥 Test execution failed with error:', 'red');
    printResult(`   ${error.message}`, 'red');
    return { ...testResults, overall: 'ERROR', error: error.message };
  } finally {
    // Close database connection if it was opened
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      printResult('\n🔌 Database connection closed', 'cyan');
    }
  }
}

// Export for use in other files
module.exports = { runAllTests, testResults };

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then((results) => {
      process.exit(results.overall === 'SUCCESS' ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

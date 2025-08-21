require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI not set');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection with different SSL configurations...\n');

const testConnections = [
  {
    name: 'Standard SSL',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      retryWrites: true,
      w: 'majority'
    }
  },
  {
    name: 'TLS',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority'
    }
  },
  {
    name: 'SSL without validation',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      retryWrites: true,
      w: 'majority'
    }
  },
  {
    name: 'No SSL (fallback)',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: false,
      retryWrites: true,
      w: 'majority'
    }
  }
];

async function testConnection(name, options) {
  try {
    console.log(`🔄 Testing: ${name}`);
    console.log(`   Options:`, JSON.stringify(options, null, 2));
    
    const startTime = Date.now();
    await mongoose.connect(mongoURI, options);
    const endTime = Date.now();
    
    console.log(`✅ SUCCESS: ${name} - Connected in ${endTime - startTime}ms`);
    
    // Test a simple operation
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log(`   Ping result:`, result);
    
    await mongoose.disconnect();
    console.log(`   Disconnected successfully\n`);
    return true;
    
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error:`, error.message);
    console.log(`   Code:`, error.code || 'N/A');
    console.log(`   Type:`, error.constructor.name);
    console.log('');
    return false;
  }
}

async function runTests() {
  console.log(`📡 Testing connection to: ${mongoURI.substring(0, 50)}...\n`);
  
  let successCount = 0;
  
  for (const test of testConnections) {
    const success = await testConnection(test.name, test.options);
    if (success) successCount++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`📊 Test Results: ${successCount}/${testConnections.length} connections successful`);
  
  if (successCount === 0) {
    console.log('\n🚨 All connection methods failed!');
    console.log('💡 Try these solutions:');
    console.log('   1. Check your MongoDB Atlas network access settings');
    console.log('   2. Verify your connection string format');
    console.log('   3. Check if MongoDB Atlas is experiencing issues');
    console.log('   4. Try connecting from a different network');
  } else {
    console.log('\n🎉 At least one connection method works!');
    console.log('💡 Use the successful configuration in your main app.');
  }
}

runTests().catch(console.error);

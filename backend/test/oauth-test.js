import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User'
};

let authToken = '';

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      data
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testRegisterAndLogin = async () => {
  console.log('\n🧪 Testing user registration and login...');
  
  try {
    // Register user
    const registerResponse = await makeRequest('post', '/auth/register', testConfig);
    console.log('✅ User registered successfully');
    
    // Login user
    const loginResponse = await makeRequest('post', '/auth/login', {
      email: testConfig.email,
      password: testConfig.password
    });
    
    authToken = loginResponse.token;
    console.log('✅ User logged in successfully');
    console.log('📝 Auth token received:', authToken.substring(0, 20) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ Registration/Login failed');
    return false;
  }
};

const testGoogleOAuthEndpoints = async () => {
  console.log('\n🧪 Testing Google OAuth endpoints...');
  
  try {
    // Test Gmail status (should be disconnected initially)
    const statusResponse = await makeRequest('get', '/auth/google/status');
    console.log('✅ Gmail status check:', statusResponse);
    
    // Test initiate Google auth
    const authResponse = await makeRequest('get', '/auth/google/login');
    console.log('✅ Google auth URL generated');
    console.log('🔗 Auth URL:', authResponse.authUrl);
    
    // Test refresh tokens (should fail without tokens)
    try {
      await makeRequest('post', '/auth/google/refresh');
      console.log('❌ Refresh should have failed (no tokens)');
    } catch (error) {
      console.log('✅ Refresh correctly failed (no tokens available)');
    }
    
    // Test disconnect (should work even if not connected)
    const disconnectResponse = await makeRequest('post', '/auth/google/disconnect');
    console.log('✅ Gmail disconnect:', disconnectResponse.message);
    
    return true;
  } catch (error) {
    console.error('❌ Google OAuth endpoints test failed');
    return false;
  }
};

const testEnvironmentVariables = () => {
  console.log('\n🧪 Testing environment variables...');
  
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_REDIRECT_URI',
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allPresent = false;
    }
  });
  
  if (!allPresent) {
    console.log('\n💡 Create a .env file in the backend directory with:');
    console.log('GOOGLE_CLIENT_ID=your_google_client_id');
    console.log('GOOGLE_CLIENT_SECRET=your_google_client_secret');
    console.log('GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback');
    console.log('JWT_SECRET=your_jwt_secret');
    console.log('MONGODB_URI=mongodb://localhost:27017/email-manager');
  }
  
  return allPresent;
};

const runTests = async () => {
  console.log('🚀 Starting Google OAuth Implementation Tests\n');
  console.log('=' .repeat(50));
  
  // Test environment variables
  const envOk = testEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ Environment variables missing. Please check your .env file.');
    return;
  }
  
  // Test server connection
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('\n✅ Server is running');
  } catch (error) {
    console.log('\n❌ Server is not running. Please start your backend server first.');
    console.log('💡 To start the backend server:');
    console.log('   cd backend');
    console.log('   npm start');
    console.log('\n💡 Then run this test from the backend directory:');
    console.log('   cd backend');
    console.log('   node test/oauth-test.js');
    return;
  }
  
  // Test authentication
  const authOk = await testRegisterAndLogin();
  if (!authOk) {
    console.log('\n❌ Authentication tests failed. Cannot proceed with OAuth tests.');
    return;
  }
  
  // Test Google OAuth endpoints
  const oauthOk = await testGoogleOAuthEndpoints();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`Environment Variables: ${envOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication: ${authOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Google OAuth Endpoints: ${oauthOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (envOk && authOk && oauthOk) {
    console.log('\n🎉 All tests passed! Your Google OAuth implementation is ready.');
    console.log('\n📋 Next steps:');
    console.log('1. Test the complete OAuth flow manually:');
    console.log('   - Call GET /api/auth/google/login to get auth URL');
    console.log('   - Visit the URL in browser to authenticate with Google');
    console.log('   - Extract the code from callback URL');
    console.log('   - Call POST /api/auth/google/callback with the code');
    console.log('2. Integrate with your frontend application');
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues above.');
  }
};

// Run tests
runTests().catch(console.error);

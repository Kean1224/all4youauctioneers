// Test environment configuration
const criticalVars = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = criticalVars.filter(v => !process.env[v] || process.env[v] === 'supersecretkey' || process.env[v].includes('your-'));

if (missing.length > 0) {
  console.log('❌ CRITICAL: Missing or default environment variables:', missing.join(', '));
  console.log('⚠️  Setting temporary values for testing...');
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-testing-only-must-be-changed-in-production';
  process.env.ADMIN_EMAIL = 'admin@test.com';
  process.env.ADMIN_PASSWORD = 'TestAdmin123!';
  process.env.SMTP_FROM = 'test@example.com';
  process.env.SMTP_USER = 'test@example.com';
}

console.log('✅ Environment variables configured for testing');
console.log('JWT_SECRET length:', (process.env.JWT_SECRET || '').length);
console.log('Admin email set:', !!process.env.ADMIN_EMAIL);
console.log('Test environment ready');
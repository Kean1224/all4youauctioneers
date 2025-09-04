// This script will update the admin password hash directly
const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Tristan@89';
  console.log('🔐 Generating bcrypt hash for password:', password);
  
  const hash = await bcrypt.hash(password, 12);
  console.log('✅ Generated hash:', hash);
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('🧪 Hash validation test:', isValid ? '✅ VALID' : '❌ INVALID');
  
  // Generate SQL command
  console.log('\n📝 SQL Command to run in your database:');
  console.log('```sql');
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = NOW() WHERE email = 'admin@all4youauctions.co.za' AND role = 'admin';`);
  console.log('```');
  
  return hash;
}

generateHash();
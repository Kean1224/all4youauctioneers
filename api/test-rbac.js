// Simple RBAC System Test Script
require('dotenv').config();

const dbManager = require('./database/connection');

async function testRBACSystem() {
  console.log('🧪 Testing Simple RBAC System...\n');
  
  try {
    // Initialize database connection
    await dbManager.initialize();
    console.log('✅ Database connection initialized\n');
    
    // Test 1: Check if role column exists
    console.log('📋 Testing users table structure...');
    const tableInfo = await dbManager.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Users table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    const hasRoleColumn = tableInfo.rows.some(col => col.column_name === 'role');
    console.log(`✅ Role column exists: ${hasRoleColumn}\n`);
    
    // Test 2: Check for admin users
    console.log('👤 Testing admin users...');
    const adminUsers = await dbManager.query(`
      SELECT id, email, name, role, email_verified, fica_approved, created_at
      FROM users 
      WHERE role = 'admin' OR email = 'admin@all4youauctions.co.za'
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${adminUsers.rows.length} admin users:`);
    adminUsers.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
      console.log(`     Role: ${user.role || 'NULL'}`);
      console.log(`     Email verified: ${user.email_verified}`);
      console.log(`     FICA approved: ${user.fica_approved}`);
      console.log(`     Created: ${user.created_at}`);
      console.log('');
    });
    
    // Test 3: Check all user roles
    console.log('👥 Testing all user roles...');
    const allUsers = await dbManager.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE role IS NOT NULL
      GROUP BY role 
      ORDER BY count DESC
    `);
    
    console.log('✅ User role distribution:');
    allUsers.rows.forEach(roleCount => {
      console.log(`   ${roleCount.role}: ${roleCount.count} users`);
    });
    
    const nullRoleUsers = await dbManager.query(`SELECT COUNT(*) as count FROM users WHERE role IS NULL`);
    console.log(`   NULL role: ${nullRoleUsers.rows[0].count} users\n`);
    
    // Test 4: Check migration status
    console.log('📋 Testing migration status...');
    const migrationStatus = await dbManager.query(`
      SELECT version, name, executed_at 
      FROM migrations 
      ORDER BY version DESC 
      LIMIT 5
    `);
    
    console.log('✅ Latest migrations:');
    migrationStatus.rows.forEach(migration => {
      console.log(`   v${migration.version}: ${migration.name}`);
      if (migration.executed_at) {
        console.log(`     Executed: ${migration.executed_at}`);
      }
    });
    console.log('');
    
    // Test 5: Database integrity check
    console.log('🔍 Testing database integrity...');
    
    const totalUsers = await dbManager.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Total users: ${totalUsers.rows[0].count}`);
    
    const usersWithEmail = await dbManager.query('SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL AND email != \'\'');
    console.log(`✅ Users with email: ${usersWithEmail.rows[0].count}`);
    
    const verifiedUsers = await dbManager.query('SELECT COUNT(*) as count FROM users WHERE email_verified = true');
    console.log(`✅ Verified users: ${verifiedUsers.rows[0].count}`);
    
    console.log('\n🎉 Simple RBAC System Test Complete!');
    
    // Summary
    console.log('\n📊 RBAC System Summary:');
    console.log(`   Role column exists: ${hasRoleColumn ? 'Yes' : 'No'}`);
    console.log(`   Admin users: ${adminUsers.rows.length}`);
    console.log(`   Total users: ${totalUsers.rows[0].count}`);
    console.log(`   System status: ${hasRoleColumn && adminUsers.rows.length > 0 ? 'Ready' : 'Needs Setup'}`);
    
  } catch (error) {
    console.error('❌ RBAC Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n🔌 Test completed');
  }
}

// Run the test
testRBACSystem();
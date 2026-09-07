import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { generateUuid } from '../common/utils/uuid.util';
import { UserStatus, UserRole } from '../common/constants';

dotenv.config({ path: ['.env', '../.env'] });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/peopleos';

const adminEmail = (process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@peopleos.internal').trim().toLowerCase();
const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@12345';
const firstName = process.env.SEED_SUPER_ADMIN_FIRSTNAME || 'System';
const lastName = process.env.SEED_SUPER_ADMIN_LASTNAME || 'Administrator';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not established');

  const usersCollection = db.collection<any>('users');

  const existingAdmin = await usersCollection.findOne({ email: adminEmail });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const superAdmin = {
      _id: generateUuid(),
      email: adminEmail,
      passwordHash,
      firstName,
      lastName,
      status: UserStatus.ACTIVE,
      roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN],
      permissions: ['*'],
      failedLoginAttempts: 0,
      lockedUntil: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(superAdmin);
    console.log('----------------------------------------------------');
    console.log('✅ Super Admin seed user created successfully:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role:     ${UserRole.SUPER_ADMIN}`);
    console.log('----------------------------------------------------');
  } else {
    console.log('----------------------------------------------------');
    console.log(`ℹ️ Super Admin user already exists: ${adminEmail}`);
    console.log('----------------------------------------------------');
  }

  // ---------------------------------------------------------------------------
  // 2. Secondary Test User: mvp.bose23@gmail.com
  // ---------------------------------------------------------------------------
  const testUserEmail = 'mvp.bose23@gmail.com';
  const testUserPassword = 'Test@123';
  const existingTestUser = await usersCollection.findOne({ email: testUserEmail });

  if (!existingTestUser) {
    const testPasswordHash = await bcrypt.hash(testUserPassword, 12);
    const testUser = {
      _id: generateUuid(),
      email: testUserEmail,
      passwordHash: testPasswordHash,
      firstName: 'Bose',
      lastName: 'Tester',
      status: UserStatus.ACTIVE,
      roles: [UserRole.HR_ADMIN, UserRole.MANAGER],
      permissions: ['*'],
      failedLoginAttempts: 0,
      lockedUntil: null,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(testUser);
    console.log('✅ Test user created successfully:');
    console.log(`   Email:    ${testUserEmail}`);
    console.log(`   Password: ${testUserPassword}`);
    console.log(`   Role:     ${UserRole.HR_ADMIN}`);
    console.log('----------------------------------------------------');
  } else {
    // Update password to ensure Test@123 matches
    const updatedHash = await bcrypt.hash(testUserPassword, 12);
    await usersCollection.updateOne(
      { email: testUserEmail },
      { $set: { passwordHash: updatedHash, status: UserStatus.ACTIVE, failedLoginAttempts: 0 } },
    );
    console.log(`ℹ️ Test user credentials updated: ${testUserEmail} / ${testUserPassword}`);
    console.log('----------------------------------------------------');
  }

  await mongoose.disconnect();
  console.log('Seeding process completed.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { generateUuid } from '../common/utils/uuid.util';
import { UserStatus, UserRole } from '../common/constants';

dotenv.config({ path: ['.env', '../.env'] });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/peopleos';

const adminEmail = (process.env.SEED_SUPER_ADMIN_EMAIL || 'systemuser@gmail.com').trim().toLowerCase();
const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'Test@123';
const firstName = process.env.SEED_SUPER_ADMIN_FIRSTNAME || 'System';
const lastName = process.env.SEED_SUPER_ADMIN_LASTNAME || 'User';

/*
 * The demo employee login.
 *
 * Chosen by employee code rather than by a generated address, because the super
 * admin has no employee record and so cannot exercise anything keyed on one —
 * Atrium, "my attendance", "my leave". Testing those needs an account that is a
 * real person in the roster, not a synthetic one alongside it.
 *
 * Keep DEMO_EMPLOYEE_CODE in step with the address printed on the login page
 * (frontend/src/features/auth/LoginPage.tsx); nothing enforces that at compile
 * time, so changing one means changing the other.
 */
const demoEmployeeCode = (process.env.SEED_DEMO_EMPLOYEE_CODE || '10008').trim();
const demoEmployeePassword = process.env.SEED_DEMO_EMPLOYEE_PASSWORD || 'Employee@12345';

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
    /*
     * Realign the credentials rather than skipping.
     *
     * The old branch only reported that the account existed, so once the stored
     * hash drifted from SEED_SUPER_ADMIN_PASSWORD — a manual change, a restored
     * dump, a half-finished reset — re-running the seed could never repair it,
     * and the password printed on the login page silently stopped being true.
     * A create-only seed cannot fix the one account you cannot get in without.
     *
     * The lockout counters are cleared at the same time: an admin locked out by
     * failed attempts is just as shut out as one with the wrong password.
     */
    const matches = existingAdmin.passwordHash
      ? await bcrypt.compare(adminPassword, existingAdmin.passwordHash)
      : false;

    // Production is the one place where silently resetting an admin password is
    // the wrong default, so there it takes an explicit opt-in.
    const allowReset =
      process.env.NODE_ENV !== 'production' ||
      process.env.SEED_RESET_SUPER_ADMIN_PASSWORD === 'true';

    if (matches) {
      await usersCollection.updateOne(
        { email: adminEmail },
        {
          $set: {
            status: UserStatus.ACTIVE,
            isDeleted: false,
            failedLoginAttempts: 0,
            lockedUntil: null,
            roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN],
            permissions: ['*'],
            updatedAt: new Date(),
          },
        },
      );
      console.log('----------------------------------------------------');
      console.log(`ℹ️ Super Admin already correct: ${adminEmail}`);
      console.log('   Account unlocked and roles reasserted.');
      console.log('----------------------------------------------------');
    } else if (allowReset) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await usersCollection.updateOne(
        { email: adminEmail },
        {
          $set: {
            passwordHash,
            status: UserStatus.ACTIVE,
            isDeleted: false,
            failedLoginAttempts: 0,
            lockedUntil: null,
            roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN],
            permissions: ['*'],
            updatedAt: new Date(),
          },
        },
      );
      console.log('----------------------------------------------------');
      console.log(`♻️ Super Admin credentials realigned: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('----------------------------------------------------');
    } else {
      console.log('----------------------------------------------------');
      console.log(`⚠️ Super Admin password does NOT match SEED_SUPER_ADMIN_PASSWORD.`);
      console.log('   Refusing to reset it in production.');
      console.log('   Set SEED_RESET_SUPER_ADMIN_PASSWORD=true to force it.');
      console.log('----------------------------------------------------');
    }
  }

  // ---------------------------------------------------------------------------
  // 2. The super admin's own employee record
  // ---------------------------------------------------------------------------
  const employeesCollection = db.collection<any>('employees');
  const rolesCollection = db.collection<any>('roles');

  /*
   * Give the super admin an employee record of its own.
   *
   * Anything keyed on being a person — Atrium, my attendance, my leave — needs
   * one, and without it the account is told it has no profile. The alternative,
   * pointing the login at somebody else's record, is precisely the bug that let
   * this account read and edit an unrelated colleague's profile; a system
   * account borrowing a real person's identity is never the answer.
   *
   * Department and designation are left empty rather than guessed. This is an
   * administrator, not a hire, and inventing a reporting line for it would put
   * fiction into the org chart.
   */
  const superAdminUser = await usersCollection.findOne({ email: adminEmail });

  if (superAdminUser && process.env.SEED_LINK_SUPER_ADMIN_EMPLOYEE !== 'false') {
    const linked = await employeesCollection.findOne({
      isDeleted: { $ne: true },
      $or: [{ userId: superAdminUser._id }, { workEmail: adminEmail }],
    });

    if (linked) {
      // Assert the link even when the row already exists: resolution prefers
      // `userId`, and matching on work email alone is correct only by luck.
      await employeesCollection.updateOne(
        { _id: linked._id },
        { $set: { userId: superAdminUser._id, updatedAt: new Date() } },
      );
      console.log('----------------------------------------------------');
      console.log(`ℹ️ Super Admin already linked to employee ${linked.employeeCode}`);
      console.log('----------------------------------------------------');
    } else {
      const adminEmployeeId = generateUuid();
      const anyEmployee = await employeesCollection.findOne({ isDeleted: { $ne: true } });

      await employeesCollection.insertOne({
        _id: adminEmployeeId,
        // Inherits whichever organization the roster already belongs to, so the
        // record cannot land in an org of its own and vanish from every view.
        organizationId: anyEmployee?.organizationId,
        employeeCode: 'SYS-0001',
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        workEmail: adminEmail,
        departmentId: '',
        designationId: '',
        status: 'ACTIVE',
        userId: superAdminUser._id,
        joiningDate: new Date(),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('----------------------------------------------------');
      console.log(`✅ Employee record created for the Super Admin: SYS-0001`);
      console.log('   Atrium and the other self-service pages now work for it.');
      console.log('   Set SEED_LINK_SUPER_ADMIN_EMPLOYEE=false to skip this.');
      console.log('----------------------------------------------------');
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Demo employee login, bound to a real person in the roster
  // ---------------------------------------------------------------------------

  const demoEmployee = await employeesCollection.findOne({
    employeeCode: demoEmployeeCode,
    isDeleted: { $ne: true },
  });

  if (!demoEmployee) {
    console.log('----------------------------------------------------');
    console.log(`⚠️ No employee with code ${demoEmployeeCode}; skipping the demo login.`);
    console.log('   Set SEED_DEMO_EMPLOYEE_CODE to one that exists.');
    console.log('----------------------------------------------------');
  } else if (!demoEmployee.workEmail) {
    console.log('----------------------------------------------------');
    console.log(`⚠️ Employee ${demoEmployeeCode} has no work email; skipping the demo login.`);
    console.log('----------------------------------------------------');
  } else {
    const demoEmail = String(demoEmployee.workEmail).trim().toLowerCase();

    /*
     * Permissions come from the Standard Employee role rather than a literal
     * list, so the demo account keeps whatever that role is granted later.
     * `org:profile:read` is added because the app shell reads the organization
     * profile to render its branding, and an account that cannot do that looks
     * broken for reasons unrelated to what is being demonstrated.
     */
    const employeeRole = await rolesCollection.findOne({ code: 'employee' });
    const permissions = Array.from(
      new Set([...(employeeRole?.permissions || []), 'org:profile:read']),
    );

    const passwordHash = await bcrypt.hash(demoEmployeePassword, 12);
    const existingDemo = await usersCollection.findOne({ email: demoEmail });
    const demoUserId = existingDemo?._id || generateUuid();

    const commonFields = {
      email: demoEmail,
      passwordHash,
      firstName: demoEmployee.firstName || 'Demo',
      lastName: demoEmployee.lastName || 'Employee',
      status: UserStatus.ACTIVE,
      roles: [UserRole.EMPLOYEE],
      permissions,
      organizationId: demoEmployee.organizationId,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isDeleted: false,
      updatedAt: new Date(),
    };

    if (existingDemo) {
      // Realigned every run for the same reason the admin is: a demo credential
      // printed on the login page has to stay true.
      await usersCollection.updateOne({ _id: demoUserId }, { $set: commonFields });
    } else {
      await usersCollection.insertOne({ _id: demoUserId, ...commonFields, createdAt: new Date() });
    }

    /*
     * The explicit link, which is what Atrium resolves on. Without it the login
     * would fall back to matching by work email — correct here, but only by
     * luck, and silently broken the day the address changes.
     */
    await employeesCollection.updateOne(
      { _id: demoEmployee._id },
      { $set: { userId: demoUserId, updatedAt: new Date() } },
    );

    console.log('----------------------------------------------------');
    console.log(`✅ Demo employee login ready: ${demoEmployee.firstName} ${demoEmployee.lastName || ''}`.trim());
    console.log(`   Email:    ${demoEmail}`);
    console.log(`   Password: ${demoEmployeePassword}`);
    console.log(`   Role:     ${UserRole.EMPLOYEE} (employee code ${demoEmployeeCode})`);
    console.log('----------------------------------------------------');
  }

  await mongoose.disconnect();
  console.log('Seeding process completed.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

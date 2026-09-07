import * as dotenv from 'dotenv';

dotenv.config({ path: ['.env', '../.env'] });

/**
 * The acceptance suite locks accounts, deletes departments and writes audit
 * rows. Pointing it at a dedicated database keeps the development data — and
 * anyone's local login — untouched. `MONGODB_URI_TEST` overrides this when a
 * CI runner supplies its own instance.
 */
process.env.MONGODB_URI =
  process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/peopleos_e2e';

process.env.NODE_ENV = 'test';

// Acceptance tests assert behaviour against the source of truth, so they run
// with the cache off. CACHE_STATUS=DISABLED is a supported configuration, not a
// degradation — see releases/release1/CACHE_HELPER_GUIDE.md.
process.env.CACHE_STATUS = 'DISABLED';

// Deterministic secrets so a missing .env never turns into a confusing
// "secretOrPrivateKey must have a value" failure mid-suite.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'e2e-refresh-secret';

import { pool } from './db';

/**
 * Runs database migrations to add new columns to existing tables
 * This is used as an alternative to the drizzle-kit push command
 * which requires interactive user input
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');
  
  try {
    // Create role enum type if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin', 'suspended');
          RAISE NOTICE 'Created user_role enum type';
        END IF;
      END $$;
    `);

    // Create subscription plan enum type if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
          CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium', 'business');
          RAISE NOTICE 'Created subscription_plan enum type';
        END IF;
      END $$;
    `);

    // Add new columns to users table
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan DEFAULT 'free';
          RAISE NOTICE 'Columns added to users table';
        EXCEPTION
          WHEN undefined_object THEN
            RAISE NOTICE 'Issue with user_role or subscription_plan type, may need manual intervention';
        END;
      END $$;
    `);

    // Add isExpired and isPublic columns to shared_files if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;
          ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'Columns added to shared_files table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Columns already exist in shared_files table';
        END;
      END $$;
    `);
    
    // Handle file_access_logs table to ensure it's compatible with our code
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          -- Drop country and city columns if they exist to match our schema
          ALTER TABLE file_access_logs DROP COLUMN IF EXISTS country;
          ALTER TABLE file_access_logs DROP COLUMN IF EXISTS city;
          RAISE NOTICE 'Columns removed from file_access_logs table';
        EXCEPTION
          WHEN undefined_column THEN 
            RAISE NOTICE 'Columns do not exist in file_access_logs table';
        END;
      END $$;
    `);

    // Add accentColor to user_settings table
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8BD3D6';
          RAISE NOTICE 'accent_color column added to user_settings table';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'accent_color column already exists in user_settings table';
        END;
      END $$;
    `);

    // Create subscription_plans table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        price_monthly INTEGER NOT NULL,
        price_yearly INTEGER NOT NULL,
        stripe_price_id_monthly TEXT,
        stripe_price_id_yearly TEXT,
        features JSONB NOT NULL DEFAULT '{}',
        max_accounts INTEGER NOT NULL,
        max_storage INTEGER NOT NULL,
        max_bandwidth INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create billing_records table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing_records (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        stripe_invoice_id TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        billing_date TIMESTAMP NOT NULL,
        paid_date TIMESTAMP,
        description TEXT,
        receipt_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create usage_stats table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_stats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        account_id INTEGER REFERENCES s3_accounts(id),
        storage_used INTEGER DEFAULT 0,
        bandwidth_used INTEGER DEFAULT 0,
        object_count INTEGER DEFAULT 0,
        date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create admin_logs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id VARCHAR NOT NULL REFERENCES users(id),
        target_user_id VARCHAR REFERENCES users(id),
        action TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
    throw error;
  }
}
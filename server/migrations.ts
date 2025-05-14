import { pool } from './db';

/**
 * Runs database migrations to add new columns to existing tables
 * This is used as an alternative to the drizzle-kit push command
 * which requires interactive user input
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');
  
  try {
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
    // by checking and fixing the columns that might be causing errors
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
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
    throw error;
  }
}
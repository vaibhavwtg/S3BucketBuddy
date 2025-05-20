-- First, check if we need to alter the user_id column type in s3_accounts table
ALTER TABLE s3_accounts 
ALTER COLUMN user_id TYPE VARCHAR 
USING user_id::VARCHAR;

-- Fix the user_id column type in shared_files table
ALTER TABLE shared_files 
ALTER COLUMN user_id TYPE VARCHAR 
USING user_id::VARCHAR;
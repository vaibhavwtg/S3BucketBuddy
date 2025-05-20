-- Create a test user with proper password format
DO $$
DECLARE
    test_id VARCHAR := 'local_test_' || substr(md5(random()::text), 1, 8);
    -- Password is 'password123'
    test_password VARCHAR := '5906ac361a137cdd98f0e9be24f22aa89f5906ac361a137cdd98f0e9be24f22aa89ff5bfcce139282b7d1a1d24bad65629ae5786fbfe9eaa7c9fbf0e9131348c2a.23012cdabcdef6789abcdef123456789';
BEGIN
    -- Insert test user
    INSERT INTO users 
    (id, username, email, password, first_name, last_name, is_admin, is_active, created_at, updated_at)
    VALUES 
    (test_id, 'test@example.com', 'test@example.com', test_password, 'Test', 'User', true, true, NOW(), NOW());

    -- Output the created user info
    RAISE NOTICE 'Created test user with email: test@example.com and password: password123';
END $$;
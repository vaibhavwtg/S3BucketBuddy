-- This script updates an existing user account with a properly formatted password
-- The password will be 'password123'

-- First, let's create a correct password hash format
-- This is equivalent to hashPassword('password123') from our code
UPDATE users 
SET password = '8aa1f5c1c1c271c6d9e5b3b2028583d92e9bf47c3a2835b956c14e0938962fddf02af6eae87d190e8a95c5e71f4621d1c232440fdc01d0cee4c964c57e3baae8.7b7dd08b70fdfe61cae7e878a9da28fc' 
WHERE email = 'vaibhav.pandey@gmail.com';

-- Make the user an admin if needed
UPDATE users 
SET is_admin = true 
WHERE email = 'vaibhav.pandey@gmail.com';

-- Output message
SELECT 'Password updated for user: ' || email AS message 
FROM users 
WHERE email = 'vaibhav.pandey@gmail.com';
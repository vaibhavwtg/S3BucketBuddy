# S3 Manager - macOS Installation Guide

This guide provides detailed instructions for setting up and running the S3 Manager application on macOS.

## Prerequisites Installation

If you don't have the required dependencies installed, follow these steps:

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js and npm

```bash
brew install node@18
```

Add Node.js to your PATH if prompted.

### 3. Install PostgreSQL

```bash
brew install postgresql@14
brew services start postgresql@14
```

### 4. Create a PostgreSQL user (if needed)

```bash
createuser -s postgres
```

## Application Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd s3-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

Create a new PostgreSQL database:

```bash
createdb s3manager -U postgres
```

### 4. Initialize the Database Schema

Run the database initialization SQL script:

```bash
psql -U postgres -d s3manager -f db-setup.sql
```

Create `db-setup.sql` with the following content:

```sql
-- Create the session table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255),
  "lastName" VARCHAR(255),
  "profileImageUrl" VARCHAR(255),
  "isAdmin" BOOLEAN DEFAULT FALSE NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create S3 accounts table
CREATE TABLE IF NOT EXISTS s3_accounts (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "accessKeyId" VARCHAR(255) NOT NULL,
  "secretAccessKey" VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  "defaultBucket" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create shared files table
CREATE TABLE IF NOT EXISTS shared_files (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  "accountId" INTEGER REFERENCES s3_accounts(id) NOT NULL,
  bucket VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filesize BIGINT NOT NULL,
  "contentType" VARCHAR(255),
  "shareToken" VARCHAR(255) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "allowDownload" BOOLEAN DEFAULT TRUE,
  password VARCHAR(255),
  "accessCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create file access logs table
CREATE TABLE IF NOT EXISTS file_access_logs (
  id SERIAL PRIMARY KEY,
  "fileId" INTEGER REFERENCES shared_files(id) NOT NULL,
  "accessedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "ipAddress" VARCHAR(50),
  "userAgent" VARCHAR(512)
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  "defaultAccountId" INTEGER REFERENCES s3_accounts(id),
  notifications BOOLEAN DEFAULT TRUE,
  "viewMode" VARCHAR(50) DEFAULT 'grid',
  "lastAccessed" TEXT[] DEFAULT '{}'
);
```

### 5. Create a Test User

Create a file named `create-test-user.sql`:

```sql
INSERT INTO users (id, username, email, password, "isAdmin", "isActive", "createdAt", "updatedAt")
VALUES (
  'local_' || substr(md5(random()::text), 1, 16),
  'test@example.com',
  'test@example.com',
  '$2a$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aULe9imQXCS', -- password: 'password'
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

Execute it with:

```bash
psql -U postgres -d s3manager -f create-test-user.sql
```

### 6. Configure Environment Variables

Create a `.env` file in the root directory:

```
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/s3manager
PGUSER=postgres
PGPASSWORD=postgres
PGHOST=localhost
PGPORT=5432
PGDATABASE=s3manager

# Session security
SESSION_SECRET=your_secure_random_string
```

Replace the placeholder values with your actual PostgreSQL credentials.

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Log In to the Application

Use the test account credentials:
- Email: test@example.com
- Password: password

## Adding an AWS S3 Account

After logging in:

1. Navigate to the "Accounts" page
2. Click "Add New Account"
3. Complete the form with your AWS S3 credentials:
   - Account Name: A descriptive name
   - Access Key ID: Your AWS access key
   - Secret Access Key: Your AWS secret key
   - Region: Your S3 region (e.g., us-east-1)
   - Default Bucket: Optional default bucket

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   brew services list | grep postgresql
   ```

2. Check database credentials in your `.env` file

3. Reset the database if needed:
   ```bash
   dropdb s3manager -U postgres
   createdb s3manager -U postgres
   psql -U postgres -d s3manager -f db-setup.sql
   ```

### Application Startup Problems

1. Clear node modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check for error messages in the console

3. Verify Node.js version:
   ```bash
   node --version
   ```

## Additional Configuration

### Changing the Application Port

To run the application on a different port, edit the `.env` file and add:

```
PORT=3000
```

This will run the application on port 3000 instead of the default 5000.

### Browser Support

The application is optimized for Chrome, Firefox, and Safari on macOS.
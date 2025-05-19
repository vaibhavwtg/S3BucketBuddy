# S3 Manager - Installation Guide

This document provides step-by-step instructions for setting up and running the S3 Manager application on your local machine.

## Prerequisites

Before starting, ensure you have the following installed on your Mac:

- Node.js (v18+ recommended)
- npm (v8+ recommended)
- PostgreSQL (v14+ recommended)
- Git

### Installing Prerequisites on macOS

If you don't have these dependencies installed, you can use Homebrew:

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and npm
brew install node@18

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create a database user (if needed)
createuser -s postgres
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/s3-manager.git
cd s3-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database for the application:

```bash
psql -U postgres
```

Inside the PostgreSQL shell:

```sql
CREATE DATABASE s3manager;
\c s3manager
```

### 4. Set Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database connection
DATABASE_URL=postgresql://yourusername:yourpassword@localhost:5432/s3manager
PGUSER=yourusername
PGPASSWORD=yourpassword
PGHOST=localhost
PGPORT=5432
PGDATABASE=s3manager

# Security
SESSION_SECRET=your_random_secure_string

# Optional Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id  
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 5. Initialize the Database Schema

Run the Drizzle migration to set up your database schema:

```bash
npm run db:push
```

## Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Setting Up a User Account

### Initial User Setup

Use the following SQL query to create an initial user if you don't want to use the registration form:

```sql
INSERT INTO users (id, username, email, password, "isAdmin", "isActive", "createdAt", "updatedAt")
VALUES (
  'local_' || substr(md5(random()::text), 1, 16),
  'admin@example.com',
  'admin@example.com',
  '$2a$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aULe9imQXCS', -- password: 'password'
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

## Database Schema

The application uses the following tables:

### 1. users
Stores user account information.

### 2. s3_accounts
Stores S3 account credentials.

### 3. shared_files
Stores information about shared files.

### 4. file_access_logs
Logs file access history.

### 5. user_settings
Stores user preferences.

### 6. sessions
Manages user sessions.

### Manual Database Queries

Here are some useful queries for managing the application:

#### List All Users
```sql
SELECT * FROM users;
```

#### List All S3 Accounts
```sql
SELECT * FROM s3_accounts;
```

#### List All Shared Files
```sql
SELECT * FROM shared_files;
```

#### List Access Logs for a Specific File
```sql
SELECT * FROM file_access_logs WHERE "fileId" = <file_id>;
```

#### Get User Settings
```sql
SELECT * FROM user_settings WHERE "userId" = '<user_id>';
```

#### Add a New S3 Account Manually
```sql
INSERT INTO s3_accounts (
  "userId", 
  name, 
  "accessKeyId", 
  "secretAccessKey", 
  region, 
  "defaultBucket", 
  "isActive", 
  "createdAt"
)
VALUES (
  '<user_id>', 
  'My AWS Account', 
  'YOUR_AWS_ACCESS_KEY_ID', 
  'YOUR_AWS_SECRET_ACCESS_KEY', 
  'us-east-1', 
  'my-bucket-name', 
  true, 
  CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues, verify:
- PostgreSQL service is running on your Mac
- Correct credentials in your `.env` file
- The database has been created

To check PostgreSQL status:
```bash
brew services list | grep postgres
```

### Application Startup Issues

- Check Node.js and npm versions are compatible
- Ensure all dependencies are installed
- Verify environment variables are correctly set
- Look at console output for specific error messages

## Additional Configuration

### Customizing the Port

If you want to run the application on a port other than 5000, modify the `server/index.ts` file:

```typescript
const PORT = process.env.PORT || 5000;
```

Change it to your desired port:

```typescript
const PORT = process.env.PORT || 3000;
```

### Security Considerations

In a production environment, ensure:
- Use HTTPS instead of HTTP
- Set secure and HTTP-only cookies
- Regularly rotate database credentials
- Use strong, unique passwords for all accounts
- Ensure AWS credentials have appropriate permissions (least privilege)
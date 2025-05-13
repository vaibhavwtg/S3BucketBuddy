#!/bin/bash

# S3 Browser Database Initialization Script
# This script will initialize the database for S3 Browser application

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}S3 Browser Database Initialization${NC}"
echo "This script will initialize the database for S3 Browser application."

# Prompt for database name
read -p "Enter database name [s3browser]: " DB_NAME
DB_NAME=${DB_NAME:-s3browser}

# Prompt for database user
read -p "Enter database user [s3browser]: " DB_USER
DB_USER=${DB_USER:-s3browser}

# Prompt for database password
read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Prompt for database host
read -p "Enter database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

# Prompt for database port
read -p "Enter database port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null
then
    echo -e "${RED}PostgreSQL command line tools are not installed.${NC}"
    echo "Please install PostgreSQL before running this script."
    exit 1
fi

echo -e "\n${YELLOW}Database Information:${NC}"
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"

# Confirm settings
read -p "Continue with these settings? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo -e "\n${YELLOW}Creating database and user...${NC}"

# Create user and database
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;

-- Check if database exists
SELECT 'Database exists, skipping creation' AS message
WHERE EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME');

-- Create database if not exists
CREATE DATABASE $DB_NAME WITH OWNER $DB_USER
ENCODING = 'UTF8'
LC_COLLATE = 'en_US.UTF-8'
LC_CTYPE = 'en_US.UTF-8'
TEMPLATE template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create database or user. Check your credentials and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}Database and user created successfully.${NC}"

echo -e "\n${YELLOW}Initializing database schema...${NC}"

# Run the initialization script
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db-init.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to initialize database schema. Check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}Database schema initialized successfully.${NC}"

# Create .env file with database connection string
echo -e "\n${YELLOW}Creating .env file with database connection...${NC}"

if [ -f .env ]; then
    echo -e "${YELLOW}.env file already exists. Updating DATABASE_URL only.${NC}"
    # Update DATABASE_URL in .env file
    if grep -q "DATABASE_URL" .env; then
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME|g" .env
    else
        echo -e "\nDATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" >> .env
    fi
else
    # Create new .env file
    cat > .env <<EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Session Configuration (generate a random string for security)
SESSION_SECRET=$(openssl rand -hex 32)

# Application Configuration
PORT=5000
NODE_ENV=development
EOF
fi

echo -e "${GREEN}Environment configuration created/updated.${NC}"
echo -e "\n${GREEN}Database initialization completed successfully!${NC}"
echo -e "${YELLOW}You can now start the application with:${NC}"
echo "npm run dev"
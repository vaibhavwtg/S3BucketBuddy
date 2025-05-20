# Setting Up S3 Accounts in the S3 Manager Application

This guide walks you through how to set up and validate AWS S3 credentials in your local installation of the S3 Manager application.

## Prerequisites

Before you begin, make sure you have:

1. Successfully installed and configured the application following the steps in MACOS_INSTALLATION.md
2. Valid AWS credentials (Access Key ID and Secret Access Key) with S3 permissions
3. The S3 Manager application running locally

## Adding a New S3 Account

1. Log in to your S3 Manager application
2. Navigate to the "Accounts" section in the sidebar
3. Click the "Add New Account" button
4. Fill in the following information:
   - **Account Name**: A friendly name to identify this S3 account (e.g., "My AWS Account")
   - **Access Key ID**: Your AWS Access Key ID
   - **Secret Access Key**: Your AWS Secret Access Key
   - **Region**: The AWS region where your S3 buckets are located (e.g., us-east-1, ap-southeast-2)
   - **Default Bucket**: (Optional) Set a default bucket to open when accessing this account

5. Click "Validate Credentials" to verify your AWS credentials are working correctly
6. Click "Save" to add the account

## Troubleshooting S3 Connection Issues

If you encounter issues connecting to your AWS S3 account:

1. **Invalid Credentials Error**:
   - Verify your Access Key ID and Secret Access Key are correct
   - Ensure the IAM user has the necessary S3 permissions (at minimum: s3:ListBuckets, s3:ListObjects, s3:GetObject)
   - Check that the AWS region specified matches where your buckets are located

2. **Connection Errors**:
   - Check your internet connection
   - Verify your firewall is not blocking AWS connections
   - Try a different AWS region if you're unsure which one contains your buckets

3. **AWS SDK Version Issues**:
   - If you're still experiencing SDK-related errors despite valid credentials, try restarting the application
   - The application uses a modern version of the AWS SDK for JavaScript (v3), which requires specific formatting for commands

## Getting AWS Credentials

If you need to create new AWS credentials:

1. Log in to the [AWS Management Console](https://aws.amazon.com/console/)
2. Navigate to IAM (Identity and Access Management)
3. Select "Users" from the navigation pane
4. Select your IAM user (or create a new one)
5. Go to the "Security credentials" tab
6. Under "Access keys", click "Create access key"
7. Store your Access Key ID and Secret Access Key in a secure location

For security best practices, we recommend creating IAM users with minimal permissions required for S3 operations.
# S3 Manager

A comprehensive web-based Amazon S3 client that provides robust multi-user file management with advanced batch operation capabilities and intelligent storage interactions.

## Key Features

- 🗂️ Multi-account S3 management in a single interface
- 🔄 Batch file operations (upload, download, copy, move, delete)
- 🔗 Advanced file sharing with expiry dates and access tracking
- 📊 Storage usage analytics and monitoring
- 👥 User management with role-based permissions
- 🎨 Modern responsive UI that works on all devices
- 🚀 Fast navigation and file operations

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Amazon S3 (via AWS SDK)
- **Authentication**: Email-based signup/login

## Getting Started

For complete installation instructions, see the [Installation Guide](INSTALLATION.md).

### Quick Start

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up your PostgreSQL database
4. Configure environment variables
5. Run the development server with `npm run dev`

## Project Structure

```
s3-manager/
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions and types
│   │   ├── pages/        # Page components
├── server/               # Backend Express application
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database access
│   ├── s3-client.ts      # S3 interaction
│   ├── auth.ts           # Authentication
├── shared/               # Shared code between frontend and backend
│   ├── schema.ts         # Database schema and types
```

## Pushing to GitHub

To push this project to your GitHub repository:

1. Create a new repository on GitHub
2. Initialize git in the project directory (if not already done):
   ```bash
   git init
   ```
3. Add all files to git:
   ```bash
   git add .
   ```
4. Commit the changes:
   ```bash
   git commit -m "Initial commit"
   ```
5. Link to your GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/s3-manager.git
   ```
6. Push the code:
   ```bash
   git push -u origin main
   ```

## License

MIT
# NEU Library Visitor Management System

A full-stack application for managing library visitors with QR code support, real-time analytics, and an admin dashboard.

[CLICK HERE FOR WEB APP](https://ai.studio/apps/ef5586b8-ca83-437e-a6d7-a3866d1aac94?fullscreenApplet=true)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

## Setup Instructions

1. **Download/Extract the files** into a folder on your computer.
2. **Open the folder in VS Code**.
3. **Open a Terminal** in VS Code (`Ctrl+` ` or `Terminal > New Terminal`).
4. **Install Dependencies**:
   ```bash
   npm install
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
6. **Open the App**:
   Navigate to `http://localhost:3000` in your web browser.

## Project Structure

- `server.ts`: Express backend with SQLite database logic.
- `src/App.tsx`: Main React frontend application.
- `src/index.css`: Tailwind CSS styling and theme configuration.
- `library.db`: The SQLite database file (created automatically on first run).
- `package.json`: Project dependencies and scripts.

## Admin Credentials

- **Email**: `admin1@neu.edu.ph`
- **Password**: `passW@rd`

## Features

- **Visitor Mode**: Check-in/out with ID number or QR code.
- **Admin Dashboard**: Real-time stats, visitor trends, and purpose distribution.
- **Activity Logs**: Searchable history of all visitors.
- **Blocking System**: Prevent specific IDs from entering.
- **PDF Export**: Generate visitor reports.
- **Dark/Light Mode**: Fully responsive and themed UI.

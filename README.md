# NEU Library Visitor Management System

A professional full-stack application for managing library visitor sessions with QR code support, real-time analytics, and a comprehensive admin dashboard.

## 🚀 Live Application

- **Development Environment:** [https://ais-dev-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app](https://ais-dev-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app)
- **Production (Shared) Environment:** [https://ais-pre-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app](https://ais-pre-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app)

## ✨ Key Features

- **Flexible Check-in Methods:** Support for both Student/Faculty ID and Email-based identification.
- **QR Code Integration:** Instant check-out by scanning generated visitor QR codes.
- **Real-time Analytics:** Live dashboard showing visitor traffic, purpose distribution, and average stay duration.
- **Comprehensive Admin Portal:** Secure access via Google Authentication to manage logs and system settings.
- **Activity Logs & Reporting:** Searchable history with the ability to export detailed reports as PDF.
- **Security & Access Control:** Integrated blocking system to manage restricted identifiers.
- **Modern UI/UX:** High-performance interface built with Tailwind CSS and Framer Motion, optimized for kiosk use.

## 🛠️ Development Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- **Backend:** Express.js (Node.js).
- **Database:** Firebase Firestore (NoSQL).
- **Authentication:** Firebase Authentication (Google OAuth).
- **Libraries:** 
  - `jsPDF` & `jspdf-autotable` for report generation.
  - `jsQR` for client-side QR code processing.
  - `date-fns` for robust date and time handling.
  - `recharts` for data visualization.

## 📦 Setup Instructions

1. **Download/Extract the files** into a folder on your computer.
2. **Open the folder in VS Code**.
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
5. **Open the App**:
   Navigate to `http://localhost:3000` in your web browser.



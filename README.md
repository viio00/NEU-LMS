# NEU LibTrac

**NEU LibTrac** is a comprehensive visitor management system designed for the New Era University Library. It streamlines the visitor logging process, tracks visit purposes, and provides administrators with powerful analytics and security tools.

## 🚀 Live Application
You can access the deployed application here:
[**NEU LibTrac Live App**](
https://ais-pre-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app)

---

## ✨ Key Features

### 👥 Visitor Management
- **Institutional Login**: Seamless check-in for students and faculty using their `@neu.edu.ph` Google accounts.
- **Outsider Registration**: Dedicated form for non-institutional visitors with email and contact verification.
- **QR Code System**: Automatically generates a unique QR code for every visitor to simplify the check-out process.
- **Identity Persistence**: Automatically remembers returning visitors' details (name, department, profile picture) based on their ID or Email.

### 🛡️ Security & Administration
- **Admin Dashboard**: Real-time monitoring of library occupancy and visitor trends.
- **Blocked/Restricted Access**: Admins can block specific IDs or emails (with case-insensitive matching) to prevent unauthorized entry.
- **Audit History**: A complete log of all administrative actions (blocking/unblocking, clearing logs) for accountability.
- **PDF Export**: Export audit history logs directly to a professionally formatted PDF.

### 🎨 User Experience
- **Modern Glassy UI**: A high-contrast, "brutalist" inspired design with glassy effects and smooth transitions.
- **Dark/Light Mode**: Full support for both dark and light themes to suit different lighting conditions.
- **Responsive Design**: Optimized for both desktop monitoring and mobile/tablet check-in kiosks.

---

## 🛠️ Tech & Dev Stack

### Frontend
- **React 19**: Modern functional components and hooks.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS 4**: Utility-first styling with a custom "glassy" theme.
- **Framer Motion**: Smooth animations and page transitions.
- **Lucide React**: Consistent and beautiful iconography.

### Backend & Database
- **Firebase Auth**: Secure Google OAuth integration for institutional members and admins.
- **Cloud Firestore**: Real-time NoSQL database for visitor logs, audit history, and blocked lists.
- **Express**: Node.js server handling the integration between Vite and backend services.

### Utilities
- **Recharts**: Interactive data visualization for the admin dashboard.
- **jsPDF & AutoTable**: Client-side PDF generation for audit reports.
- **QRCode & jsQR**: Generation and scanning of visitor check-out codes.
- **Date-fns**: Robust date formatting and manipulation.

---

## 🛠️ Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

---
*Developed for New Era University Library.*

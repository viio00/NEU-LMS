# NEU Library Visitor Kiosk

A modern, secure, and responsive visitor management system designed for the New Era University (NEU) Library. This application streamlines the check-in process for students, faculty, and outside visitors while providing a comprehensive, real-time analytics dashboard for library administrators.

## 🚀 Production Link

**Live Application:** [NEU Library Visitor Kiosk](https://ais-pre-xsnpdq7hi5z654s6bimjed-511035442414.asia-southeast1.run.app)

## ✨ Key Features

* **Multi-Role Check-In System:** Tailored check-in flows for Students, Faculty/Employees, and Outsiders.
* **Secure Admin Portal:** A protected dashboard restricted exclusively to authorized NEU library administrators (`chynna.cardona@neu.edu.ph` and `jcesperanza@neu.edu.ph`).
* **Real-Time Analytics Dashboard:** Live statistics on total visitors, peak hours, daily trends, and purpose-of-visit breakdowns.
* **Institutional Email Verification:** Integrated Google Workspace OAuth to ensure only valid NEU accounts can access restricted areas.
* **Advanced Access Control:** Custom "Access Denied" modals and strict Firestore security rules to prevent unauthorized privilege escalation.
* **Modern, Animated UI:** A sleek, glassmorphism-inspired interface with smooth transitions and responsive design for kiosk displays.

## 🛠️ Development Stack

**Frontend:**
* [React 18](https://react.dev/) - UI Library
* [Vite](https://vitejs.dev/) - Build Tool & Development Server
* [TypeScript](https://www.typescriptlang.org/) - Static Typing
* [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS Framework
* [Framer Motion](https://www.framer.com/motion/) - Animation Library
* [Lucide React](https://lucide.dev/) - Iconography
* [date-fns](https://date-fns.org/) - Date & Time Formatting

**Backend & Infrastructure:**
* [Firebase Authentication](https://firebase.google.com/docs/auth) - Google OAuth & Identity Management
* [Cloud Firestore](https://firebase.google.com/docs/firestore) - Real-time NoSQL Database
* [Firebase Security Rules](https://firebase.google.com/docs/rules) - Backend Access Control & Data Validation

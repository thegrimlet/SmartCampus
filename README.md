# Smart Campus Management System

Smart Campus Management System is a role-based campus portal built with React, Express, MongoDB, and JWT authentication. It centralizes administrative, academic, attendance, timetable, fee, result, notice, messaging, and profile workflows for administrators, faculty, and students.

## Core Roles

- **Admin:** creates student/faculty accounts, manages courses, subjects, timetables, notices, payments, results, and reports.
- **Faculty:** views assigned timetable slots, marks or updates attendance only for assigned lectures, manages class-facing academic work, and communicates with users.
- **Student:** uses a portal-style dashboard to view attendance, timetable, notices, fees, results, messages, and profile information.

## Key Features

- Admin-managed account creation for students and faculty.
- Login by roll number for students, faculty number for faculty, and email for admin.
- Forgot ID and password reset through registered email OTP flow.
- Course and subject management with semester/year structure.
- Subject types: Core and Specialisation Elective.
- GUI-oriented timetable builder by course and semester.
- Faculty attendance flow based on assigned lecture slots.
- Student filtering and profile update from the admin Students section.
- Portal-style student UI with sidebar navigation.
- Notices, fee/payment tracking, results, and messaging modules.

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Axios
- **Backend:** Node.js, Express 5, Mongoose, JWT, bcryptjs, Nodemailer
- **Database:** MongoDB

## Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart-campus
JWT_SECRET=replace-with-a-secure-secret
CLIENT_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=Smart Campus <no-reply@smartcampus.local>
```

Run the backend:

```bash
cd backend
npm start
```

Run the frontend:

```bash
cd frontend
npm run dev
```

## Verification

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run check
```

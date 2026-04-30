const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const adminRoutes = require("./routes/adminRoutes");
const profileRoutes = require("./routes/profileRoutes");
const classAssignmentRoutes = require("./routes/classAssignmentRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const resultRoutes = require("./routes/resultRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "smart-campus-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/test", testRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/class-assignments", classAssignmentRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/messages", messageRoutes);

mongoose.connect(process.env.MONGO_URI, {
  family: 4
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

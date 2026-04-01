const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const userRoutes = require("./routes/userRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const app = express();

// ✅ ALWAYS FIRST
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// ✅ THEN ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/test", testRoutes);
app.use("/api/subjects", subjectRoutes);

// DB
mongoose.connect(process.env.MONGO_URI, {
  family: 4
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// SERVER
app.listen(5000, () => console.log("Server running on port 5000"));
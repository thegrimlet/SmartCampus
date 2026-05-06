const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Profile = require("../models/Profile");
const auth = require("../middleware/authMiddleware");
const { isValidEmail, isValidPhone } = require("../utils/validators");

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }

  return true;
};

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const createPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

const duplicateMessage = (err) => {
  if (err.code !== 11000) return null;
  const field = Object.keys(err.keyPattern || {})[0];
  if (field === "email") return "Email already exists";
  if (field === "institutionalId") return "Login ID already exists";
  return "Account already exists";
};

const contactError = ({ email, phone }) => {
  if (!isValidEmail(email)) return "Enter a valid email address";
  if (!isValidPhone(phone)) return "Enter a valid phone number";
  return "";
};

const studentProfileProjection = "course semester department rollNumber firstName lastName phone address state city dateOfBirth gender fatherName fatherOccupation motherName motherOccupation photoUrl";
const facultyProfileProjection = "facultyNumber phone address state city dateOfBirth gender qualification experience photoUrl";

router.get("/students", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const query = {
      role: "student",
      emailVerified: true
    };

    if (req.query.className) {
      const profileQuery = { assignedClass: req.query.className };
      if (req.query.batch) profileQuery.assignedBatch = req.query.batch;
      const profiles = await Profile.find(profileQuery).select("user");
      query._id = { $in: profiles.map((profile) => profile.user) };
    }

    const students = await User.find(query).select("-password").sort({ name: 1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/students/manage", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const profiles = await Profile.find({ rollNumber: { $ne: null } })
      .populate("user", "-password")
      .select(studentProfileProjection)
      .sort({ course: 1, semester: 1, rollNumber: 1 });

    res.json(profiles.filter((profile) => profile.user?.role === "student"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/students", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const rollNumber = clean(req.body.rollNumber);
    const studentName = clean(req.body.name) || [clean(req.body.firstName), clean(req.body.lastName)].filter(Boolean).join(" ");
    const email = clean(req.body.email)?.toLowerCase();
    const password = req.body.password;

    if (!rollNumber || !studentName || !email || !password) {
      return res.status(400).json({ msg: "Roll number, student name, email, and password are required" });
    }
    const validationMessage = contactError({ email, phone: req.body.phone });
    if (validationMessage) {
      return res.status(400).json({ msg: validationMessage });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const user = await User.create({
      name: studentName,
      email,
      institutionalId: rollNumber,
      password: await createPassword(password),
      role: "student",
      status: "approved",
      emailVerified: true
    });

    const profile = await Profile.create({
      user: user._id,
      course: clean(req.body.course),
      semester: clean(req.body.semester),
      department: clean(req.body.department),
      rollNumber,
      firstName: studentName,
      lastName: "",
      phone: clean(req.body.phone),
      address: clean(req.body.address),
      state: clean(req.body.state),
      city: clean(req.body.city),
      dateOfBirth: req.body.dateOfBirth || undefined,
      gender: clean(req.body.gender),
      fatherName: clean(req.body.fatherName),
      fatherOccupation: clean(req.body.fatherOccupation),
      motherName: clean(req.body.motherName),
      motherOccupation: clean(req.body.motherOccupation),
      photoUrl: clean(req.body.photoUrl)
    });

    await profile.populate("user", "-password");
    res.status(201).json(profile);
  } catch (err) {
    const msg = duplicateMessage(err);
    res.status(msg ? 400 : 500).json({ msg: msg || err.message });
  }
});

router.put("/students/:profileId", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const profile = await Profile.findById(req.params.profileId).populate("user");
    if (!profile || profile.user?.role !== "student") {
      return res.status(404).json({ msg: "Student not found" });
    }

    const rollNumber = clean(req.body.rollNumber);
    const studentName = clean(req.body.name) || [clean(req.body.firstName), clean(req.body.lastName)].filter(Boolean).join(" ");
    const email = clean(req.body.email)?.toLowerCase();
    const password = req.body.password;

    if (!rollNumber || !studentName || !email) {
      return res.status(400).json({ msg: "Roll number, student name, and email are required" });
    }
    const validationMessage = contactError({ email, phone: req.body.phone });
    if (validationMessage) {
      return res.status(400).json({ msg: validationMessage });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    profile.user.name = studentName;
    profile.user.email = email;
    profile.user.institutionalId = rollNumber;
    if (password) {
      profile.user.password = await createPassword(password);
    }
    await profile.user.save();

    profile.set({
      course: clean(req.body.course),
      semester: clean(req.body.semester),
      department: clean(req.body.department),
      rollNumber,
      firstName: studentName,
      lastName: "",
      phone: clean(req.body.phone),
      address: clean(req.body.address),
      state: clean(req.body.state),
      city: clean(req.body.city),
      dateOfBirth: req.body.dateOfBirth || undefined,
      gender: clean(req.body.gender),
      fatherName: clean(req.body.fatherName),
      fatherOccupation: clean(req.body.fatherOccupation),
      motherName: clean(req.body.motherName),
      motherOccupation: clean(req.body.motherOccupation),
      photoUrl: clean(req.body.photoUrl)
    });
    await profile.save();
    await profile.populate("user", "-password");

    res.json(profile);
  } catch (err) {
    const msg = duplicateMessage(err);
    res.status(msg ? 400 : 500).json({ msg: msg || err.message });
  }
});

router.get("/faculty", auth, async (req, res) => {
  try {
    if (!["admin", "student"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.find({
      role: "faculty",
      emailVerified: true
    }).select("-password").sort({ name: 1 });

    res.json(faculty);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/faculty/manage", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const profiles = await Profile.find({ facultyNumber: { $ne: null } })
      .populate("user", "-password")
      .select(facultyProfileProjection)
      .sort({ facultyNumber: 1 });

    res.json(profiles.filter((profile) => profile.user?.role === "faculty"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/faculty", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const facultyNumber = clean(req.body.facultyNumber);
    const name = clean(req.body.name);
    const email = clean(req.body.email)?.toLowerCase();
    const password = req.body.password;

    if (!facultyNumber || !name || !email || !password) {
      return res.status(400).json({ msg: "Faculty number, name, email, and password are required" });
    }
    const validationMessage = contactError({ email, phone: req.body.phone });
    if (validationMessage) {
      return res.status(400).json({ msg: validationMessage });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const user = await User.create({
      name,
      email,
      institutionalId: facultyNumber,
      password: await createPassword(password),
      role: "faculty",
      status: "approved",
      emailVerified: true
    });

    const profile = await Profile.create({
      user: user._id,
      facultyNumber,
      phone: clean(req.body.phone),
      address: clean(req.body.address),
      state: clean(req.body.state),
      city: clean(req.body.city),
      dateOfBirth: req.body.dateOfBirth || undefined,
      gender: clean(req.body.gender),
      qualification: clean(req.body.qualification),
      experience: clean(req.body.experience),
      photoUrl: clean(req.body.photoUrl)
    });

    await profile.populate("user", "-password");
    res.status(201).json(profile);
  } catch (err) {
    const msg = duplicateMessage(err);
    res.status(msg ? 400 : 500).json({ msg: msg || err.message });
  }
});

router.get("/approved", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const users = await User.find({ emailVerified: true })
      .select("-password")
      .sort({ role: 1, name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;

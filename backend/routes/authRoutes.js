const router = require("express").Router();
const {
  register,
  login,
  verifyEmailOtp,
  verifyEmailLink,
  resendVerification
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email-otp", verifyEmailOtp);
router.get("/verify-email", verifyEmailLink);
router.post("/resend-verification", resendVerification);

module.exports = router;

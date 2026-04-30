const router = require("express").Router();
const {
  register,
  login,
  recoverId,
  requestPasswordReset,
  resetPassword
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/recover-id", recoverId);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

module.exports = router;

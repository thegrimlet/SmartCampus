const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

router.get("/protected", auth, (req, res) => {
  res.json({
    msg: "You accessed protected route",
    user: req.user
  });
});

module.exports = router;
const express = require("express");

const router = express.Router();

router.use("/customer", require("./Customer/authRoute"));
router.use("/company", require("./Company/profileRoute"));
router.use("/provider", require("./Provider/profileRoutee"));
router.use("/staff", require("./Staff/profileRoute"));

module.exports = router;

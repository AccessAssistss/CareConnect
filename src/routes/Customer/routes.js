const express = require("express");

const router = express.Router();

router.use("/auth", require("./authRoute"));
router.use("/familyMember", require("./familyMemberRoute"));
router.use("/wallet", require("./walletRoute"));
router.use("/booking", require("./bookingController"));
router.use("/rating", require("./reviewRoute"));

module.exports = router;
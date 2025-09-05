const express = require("express");

const router = express.Router();

router.use("/admin", require("./Admin/routes"));
router.use("/customer", require("./Customer/routes"));
router.use("/company", require("./Company/routes"));
router.use("/provider", require("./Provider/routes"));
router.use("/staff", require("./Staff/routes"));

module.exports = router;

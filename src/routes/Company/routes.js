const express = require("express");

const router = express.Router();

router.use("/auth", require("./profileRoute"));
router.use("/companyService", require("./companyServiceRoute"));

module.exports = router;
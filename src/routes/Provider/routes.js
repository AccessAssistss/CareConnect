const express = require("express");

const router = express.Router();

router.use("/auth", require("./profileRoutee"));
router.use("/providerService", require("./profileRoutee"));

module.exports = router;
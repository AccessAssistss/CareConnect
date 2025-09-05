const express = require("express");

const router = express.Router();

router.use("/auth", require("./profileRoute"));

module.exports = router;
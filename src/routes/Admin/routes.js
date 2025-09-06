const express = require("express");

const router = express.Router();

router.use("/country", require("./countryRoute"));
router.use("/state", require("./stateRoute"));
router.use("/service", require("./serviceRoute"));
router.use("/skill", require("./skillRoute"));

module.exports = router;
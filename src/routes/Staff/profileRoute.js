const express = require("express");
const { completeStaffProfile } = require("../../controllers/Staff/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeStaffProfile", validateToken, completeStaffProfile);

module.exports = router;
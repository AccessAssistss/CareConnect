const express = require("express");
const { completeCompanyProfile } = require("../../controllers/Company/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeCompanyProfile", validateToken, completeCompanyProfile);

module.exports = router;
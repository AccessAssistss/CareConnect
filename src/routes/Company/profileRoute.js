const express = require("express");
const { completeCompanyProfile, toggleCompanyOnlineStatus, getOnlineCompanies } = require("../../controllers/Company/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeCompanyProfile", validateToken, completeCompanyProfile);
router.patch("/toggleCompanyOnlineStatus", validateToken, toggleCompanyOnlineStatus);
router.get("/getOnlineCompanies", validateToken, getOnlineCompanies);

module.exports = router;
const express = require("express");
const { completeCompanyProfile, toggleCompanyOnlineStatus, getOnlineCompanies, getOnlineCompaniesForWeb, getCompanyProfile } = require("../../controllers/Company/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeCompanyProfile", validateToken, completeCompanyProfile);
router.patch("/toggleCompanyOnlineStatus", validateToken, toggleCompanyOnlineStatus);
router.get("/getCompanyProfile", validateToken, getCompanyProfile);
router.get("/getOnlineCompanies", validateToken, getOnlineCompanies);
router.get("/getOnlineCompaniesForWeb", validateToken, getOnlineCompaniesForWeb);

module.exports = router;
const express = require("express");
const { completeCompanyProfile, toggleCompanyOnlineStatus, getOnlineCompanies, getOnlineCompaniesForWeb, getCompanyProfile, getCompanyProfileByID } = require("../../controllers/Company/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeCompanyProfile", validateToken, completeCompanyProfile);
router.patch("/toggleCompanyOnlineStatus", validateToken, toggleCompanyOnlineStatus);
router.get("/getCompanyProfile", validateToken, getCompanyProfile);
router.get("/getCompanyProfileByID/:id", getCompanyProfileByID);
router.get("/getOnlineCompanies", validateToken, getOnlineCompanies);
router.get("/getOnlineCompaniesForWeb", getOnlineCompaniesForWeb);

module.exports = router;
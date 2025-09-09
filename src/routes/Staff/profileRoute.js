const express = require("express");
const { completeStaffProfile, getStaffProfile, getStaffProfileByID, getStaffsByCompany } = require("../../controllers/Staff/profileController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { PROVIDER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadProviderFiles = createUploadMiddleware("provider", PROVIDER_FILE_FIELDS);

router.put("/completeStaffProfile", validateToken, uploadProviderFiles, multerErrorHandler, completeStaffProfile);
router.get("/getStaffProfile", validateToken, getStaffProfile);
router.get("/getStaffProfileByID/:id", getStaffProfileByID);
router.get("/getStaffsByCompany", validateToken, getStaffsByCompany);

module.exports = router;
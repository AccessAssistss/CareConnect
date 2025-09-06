const express = require("express");
const { completeStaffProfile } = require("../../controllers/Staff/profileController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { PROVIDER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadProviderFiles = createUploadMiddleware("provider", PROVIDER_FILE_FIELDS);

router.put("/completeStaffProfile", validateToken, uploadProviderFiles, multerErrorHandler, completeStaffProfile);

module.exports = router;
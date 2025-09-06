const express = require("express");
const { completeProviderProfile, toggleProviderOnlineStatus, getOnlineProviders } = require("../../controllers/Provider/profileController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { PROVIDER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadProviderFiles = createUploadMiddleware("provider", PROVIDER_FILE_FIELDS);

router.put("/completeProviderProfile", validateToken, uploadProviderFiles, multerErrorHandler, completeProviderProfile);
router.patch("/toggleProviderOnlineStatus", validateToken, toggleProviderOnlineStatus);
router.get("/getOnlineProviders", validateToken, getOnlineProviders);

module.exports = router;
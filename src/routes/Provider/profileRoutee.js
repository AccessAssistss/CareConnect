const express = require("express");
const { completeProviderProfile, toggleProviderOnlineStatus, getOnlineProviders, getOnlineProvidersForWeb, getProviderProfile, getProviderProfileById, createProvider } = require("../../controllers/Provider/profileController");
const validateToken = require("../../../middleware/validateJwtToken");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { PROVIDER_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadProviderFiles = createUploadMiddleware("provider", PROVIDER_FILE_FIELDS);

router.put("/completeProviderProfile", validateToken, uploadProviderFiles, multerErrorHandler, completeProviderProfile);
router.patch("/toggleProviderOnlineStatus", validateToken, toggleProviderOnlineStatus);
router.get("/getProviderProfile", validateToken, getProviderProfile);
router.get("/getProviderProfileById/:id", getProviderProfileById);
router.get("/getOnlineProviders", validateToken, getOnlineProviders);
router.get("/getOnlineProvidersForWeb", getOnlineProvidersForWeb);
router.post("/createProvider", createProvider);

module.exports = router;
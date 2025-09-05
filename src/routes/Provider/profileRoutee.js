const express = require("express");
const { completeProviderProfile } = require("../../controllers/Provider/profileController");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.put("/completeProviderProfile", validateToken, completeProviderProfile);

module.exports = router;
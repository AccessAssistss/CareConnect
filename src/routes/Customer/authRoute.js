const express = require("express");
const { sendLoginOTP, verifyOTP, completeCustomerProfile, getCustomerProfile } = require("../../controllers/Customer/authControllers");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/sendLoginOTP", sendLoginOTP);
router.post("/verifyOTP", verifyOTP);
router.put("/completeCustomerProfile", validateToken, completeCustomerProfile);
router.get("/getCustomerProfile", validateToken, getCustomerProfile);

module.exports = router;
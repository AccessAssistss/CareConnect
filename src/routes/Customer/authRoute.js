const express = require("express");
const { sendLoginOTP, verifyOTP, completeCustomerProfile } = require("../../controllers/Customer/authControllers");
const validateToken = require("../../../middleware/validateJwtToken");

const router = express.Router();

router.post("/sendLoginOTP", sendLoginOTP);
router.post("/verifyOTP", verifyOTP);
router.put("/completeCustomerProfile", validateToken, completeCustomerProfile);

module.exports = router;
const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { getWallet, addMoney, deductMoney, getTransactions } = require("../../controllers/Customer/walletController");

const router = express.Router();

router.patch("/addMoney", validateToken, addMoney);
router.patch("/deductMoney", validateToken, deductMoney);
router.get("/getWallet", validateToken, getWallet);
router.get("/getTransactions", validateToken, getTransactions);

module.exports = router;
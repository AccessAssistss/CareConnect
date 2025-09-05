const express = require("express");
const {
    createState,
    updateState,
    getStatesByCountry,
    softDeleteState,
} = require("../../controllers/Admin/stateController");

const router = express.Router();

// ###############---------------State Routes---------------###############
router.post("/createState", createState);
router.put("/updateState/:stateId", updateState);
router.get("/getStatesByCountry/:countryId", getStatesByCountry);
router.patch("/softDeleteState/:stateId", softDeleteState);

module.exports = router;
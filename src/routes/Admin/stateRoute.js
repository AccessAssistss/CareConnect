const express = require("express");
const {
    createState,
    updateState,
    getStatesByCountry,
    softDeleteState,
    uploadServicesFromExcel,
} = require("../../controllers/Admin/stateController");
const multer = require("multer");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ###############---------------State Routes---------------###############
router.post("/createState", createState);
router.put("/updateState/:stateId", updateState);
router.get("/getStatesByCountry/:countryId", getStatesByCountry);
router.patch("/softDeleteState/:stateId", softDeleteState);
router.patch("/uploadServicesFromExcel", upload.single("file"), uploadServicesFromExcel);

module.exports = router;
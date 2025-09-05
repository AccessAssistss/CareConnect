const express = require("express");
const {
    createCountry,
    updateCountry,
    softDeleteCountry,
    getAllCountries,
} = require("../../controllers/Admin/countryController");

const router = express.Router();

router.post("/createCountry", createCountry);
router.put("/updateCountry/:countryId", updateCountry);
router.get("/getAllCountries", getAllCountries);
router.patch("/softDeleteCountry/:countryId", softDeleteCountry);

module.exports = router;
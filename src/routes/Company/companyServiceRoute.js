const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createCompanyService, updateCompanyService, getAllCompanyServices, getAllCompanyServicesForCustomer, deleteCompanyService } = require("../../controllers/Company/companyServiceController");

const router = express.Router();

router.post("/createCompanyService", validateToken, createCompanyService);
router.put("/updateCompanyService/:companyServiceId", validateToken, updateCompanyService);
router.get("/getAllCompanyServices", validateToken, getAllCompanyServices);
router.get("/getAllCompanyServicesForCustomer/:companyId", getAllCompanyServicesForCustomer);
router.delete("/deleteCompanyService/:companyServiceId", validateToken, deleteCompanyService);

module.exports = router;
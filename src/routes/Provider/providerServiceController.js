const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const {
  createProviderService,
  updateProviderService,
  getAllProviderServices,
  getAllProviderServicesForCustomer,
  deleteProviderService,
} = require("../../controllers/Provider/providerServiceController");

const router = express.Router();

router.post("/createProviderService", validateToken, createProviderService);
router.put("/updateProviderService/:providerServiceId", validateToken, updateProviderService);
router.get("/getAllProviderServices", validateToken, getAllProviderServices);
router.get("/getAllProviderServicesForCustomer/:providerId", getAllProviderServicesForCustomer);
router.delete("/deleteProviderService/:providerServiceId", validateToken, deleteProviderService);

module.exports = router;
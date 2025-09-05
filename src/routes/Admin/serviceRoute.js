const express = require("express");
const { createServiceCategory, getAllServiceCategories, getServiceCategoryById, updateServiceCategory, deleteServiceCategory, createService, getAllServices, getServiceById, updateService, deleteService } = require("../../controllers/Admin/serviceController");

const router = express.Router();

/* ####################--------------------Service Category Routes--------------------#################### */
router.post("/createServiceCategory", createServiceCategory);
router.get("/getAllServiceCategories", getAllServiceCategories);
router.get("/getServiceCategoryById/:id", getServiceCategoryById);
router.put("/updateServiceCategory/:id", updateServiceCategory);
router.delete("/deleteServiceCategory/:id", deleteServiceCategory);

/* ####################--------------------Service Routes--------------------#################### */
router.post("/createService", createService);
router.get("/getAllServices", getAllServices);
router.get("/getServiceById/:id", getServiceById);
router.put("/updateService/:id", updateService);
router.delete("/deleteService/:id", deleteService);

module.exports = router;
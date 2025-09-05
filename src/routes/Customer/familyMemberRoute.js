const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createFamilyMember, getFamilyMembers, getFamilyMemberById, updateFamilyMember, deleteFamilyMember } = require("../../controllers/Customer/familyMemberController");

const router = express.Router();

router.post("/createFamilyMember", validateToken, createFamilyMember);
router.get("/getFamilyMembers", validateToken, getFamilyMembers);
router.get("/getFamilyMemberById/:id", validateToken, getFamilyMemberById);
router.put("/updateFamilyMember/:id", validateToken, updateFamilyMember);
router.delete("/deleteFamilyMember/:id", validateToken, deleteFamilyMember);

module.exports = router;
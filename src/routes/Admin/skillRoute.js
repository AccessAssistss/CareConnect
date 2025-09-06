const express = require("express");
const { createSkill, getAllSkills, updateSkill, deleteSkill } = require("../../controllers/Admin/skillController");

const router = express.Router();

router.post("/createSkill", createSkill);
router.put("/updateSkill/:id", updateSkill);
router.get("/getAllSkills", getAllSkills);
router.patch("/deleteSkill/:id", deleteSkill);

module.exports = router;
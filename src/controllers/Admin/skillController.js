const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Skill----------##########
const createSkill = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) return res.respond(400, "Skill name is required");

    const existing = await prisma.skill.findUnique({ where: { name } });
    if (existing) return res.respond(409, "Skill already exists");

    const skill = await prisma.skill.create({
        data: { name },
    });

    res.respond(201, "Skill created successfully", skill);
});

// ##########----------Get All Skills----------##########
const getAllSkills = asyncHandler(async (req, res) => {
    const skills = await prisma.skill.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
    });
    res.respond(200, "Skills fetched successfully", skills);
});

// ##########----------Update Skill----------##########
const updateSkill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) return res.respond(404, "Skill not found");

    const updatedSkill = await prisma.skill.update({
        where: { id },
        data: { name },
    });

    res.respond(200, "Skill updated successfully", updatedSkill);
});

// ##########----------Soft Delete Skill----------##########
const deleteSkill = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const skill = await prisma.skill.findFirst({
        where: { id, isDeleted: false },
    });
    if (!skill) return res.respond(404, "Skill not found");

    await prisma.skill.update({
        where: { id },
        data: { isDeleted: true },
    });

    res.respond(200, "Skill deleted (soft) successfully");
});

module.exports = {
    createSkill,
    getAllSkills,
    updateSkill,
    deleteSkill,
};

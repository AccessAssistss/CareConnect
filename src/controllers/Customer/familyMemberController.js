const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Family Member----------##########
const createFamilyMember = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { name, gender, age, relation } = req.body;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const familyMember = await prisma.familyMember.create({
        data: {
            customerId: customer.id,
            name,
            gender,
            age,
            relation,
        },
    });

    res.respond(201, "Family member created successfully!", familyMember);
});

// ##########----------Get All Family Members----------##########
const getFamilyMembers = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const familyMembers = await prisma.familyMember.findMany({
        where: { customerId: customer.id, isDeleted: false },
    });

    res.respond(200, "Family members fetched successfully!", familyMembers);
});

// ##########----------Get Single Family Member----------##########
const getFamilyMemberById = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const familyMember = await prisma.familyMember.findFirst({
        where: { id, isDeleted: false },
    });

    if (!familyMember) {
        return res.respond(404, "Family member not found!");
    }

    res.respond(200, "Family member fetched successfully!", familyMember);
});

// ##########----------Update Family Member----------##########
const updateFamilyMember = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { id } = req.params;
    const { name, gender, age, relation } = req.body;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const familyMember = await prisma.familyMember.findFirst({
        where: { id, isDeleted: false },
    });
    if (!familyMember) {
        return res.respond(404, "Family member not found!");
    }

    const updated = await prisma.familyMember.update({
        where: { id },
        data: { name, gender, age, relation },
    });

    res.respond(200, "Family member updated successfully!", updated);
});

// ##########----------Delete Family Member (Soft Delete)----------##########
const deleteFamilyMember = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const familyMember = await prisma.familyMember.findFirst({
        where: { id, isDeleted: false },
    });
    if (!familyMember) {
        return res.respond(404, "Family member not found!");
    }

    await prisma.familyMember.update({
        where: { id },
        data: { isDeleted: true },
    });

    res.respond(200, "Family member deleted successfully!");
});

module.exports = {
    createFamilyMember,
    getFamilyMembers,
    getFamilyMemberById,
    updateFamilyMember,
    deleteFamilyMember,
};
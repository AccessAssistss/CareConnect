const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Company Service----------##########
const createCompanyService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { serviceId, pricePerDay } = req.body;
    if (!serviceId || !pricePerDay) {
        return res.respond(400, "companyId, serviceId, and pricePerDay are required!");
    }

    let user = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Company not found!")
    }

    const companyService = await prisma.companyService.create({
        data: {
            companyId: user.id,
            serviceId,
            pricePerDay,
        },
    });

    res.respond(201, "Company service created successfully", companyService);
});

// ##########----------Get All Company Services----------##########
const getAllCompanyServices = asyncHandler(async (req, res) => {
    const userId = req.user;

    let user = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Company not found!")
    }

    const companyServices = await prisma.companyService.findMany({
        where: { companyId: user.id, isDeleted: false },
        include: {
            service: true,
        },
    });

    res.respond(200, "Company services fetched successfully", companyServices);
});

// ##########----------Get All Company Services For Customer----------##########
const getAllCompanyServicesForCustomer = asyncHandler(async (req, res) => {
    const { companyId } = req.params;

    const companyServices = await prisma.companyService.findMany({
        where: { companyId, isDeleted: false },
        include: {
            company: true,
            service: true,
        },
    });

    res.respond(200, "Company services fetched successfully", companyServices);
});

// ##########----------Update Company Service----------##########
const updateCompanyService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { companyServiceId } = req.params;
    const { pricePerDay, isActive } = req.body;

    let user = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Company not found!")
    }

    const companyService = await prisma.companyService.update({
        where: { id: companyServiceId },
        data: {
            ...(pricePerDay !== undefined && { pricePerDay }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    res.respond(200, "Company service updated successfully", companyService);
});

// ##########----------Soft Delete Company Service----------##########
const deleteCompanyService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { companyServiceId } = req.params;

    let user = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Company not found!")
    }

    const companyService = await prisma.companyService.update({
        where: { id: companyServiceId },
        data: { isDeleted: true },
    });

    res.respond(200, "Company service soft deleted successfully", companyService);
});

module.exports = {
    createCompanyService,
    getAllCompanyServices,
    getAllCompanyServicesForCustomer,
    updateCompanyService,
    deleteCompanyService,
};
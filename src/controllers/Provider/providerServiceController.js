const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Provider Service----------##########
const createProviderService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { serviceId, pricePerDay } = req.body;

    if (!serviceId || !pricePerDay) {
        return res.respond(400, "serviceId and pricePerDay are required!");
    }

    let user = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerService = await prisma.providerService.create({
        data: {
            providerId: user.id,
            serviceId,
            pricePerDay,
        },
    });

    res.respond(201, "Provider service created successfully", providerService);
});

// ##########----------Get All Provider Services----------##########
const getAllProviderServices = asyncHandler(async (req, res) => {
    const userId = req.user;

    let user = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerServices = await prisma.providerService.findMany({
        where: { providerId: user.id, isDeleted: false },
        include: {
            service: true,
        },
    });

    res.respond(200, "Provider services fetched successfully", providerServices);
});

// ##########----------Get All Provider Services For Customer----------##########
const getAllProviderServicesForCustomer = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    const providerServices = await prisma.providerService.findMany({
        where: { providerId, isDeleted: false },
        include: {
            provider: true,
            service: true,
        },
    });

    res.respond(200, "Provider services fetched successfully", providerServices);
});

// ##########----------Update Provider Service----------##########
const updateProviderService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { providerServiceId } = req.params;
    const { pricePerDay, isActive } = req.body;

    let user = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerService = await prisma.providerService.update({
        where: { id: providerServiceId },
        data: {
            ...(pricePerDay !== undefined && { pricePerDay }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    res.respond(200, "Provider service updated successfully", providerService);
});

// ##########----------Soft Delete Provider Service----------##########
const deleteProviderService = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { providerServiceId } = req.params;

    let user = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerService = await prisma.providerService.update({
        where: { id: providerServiceId },
        data: { isDeleted: true },
    });

    res.respond(200, "Provider service soft deleted successfully", providerService);
});

module.exports = {
    createProviderService,
    getAllProviderServices,
    getAllProviderServicesForCustomer,
    updateProviderService,
    deleteProviderService,
};
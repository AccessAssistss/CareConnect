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
            providerId: user.userId,
            serviceId,
            pricePerDay,
        },
    });

    res.respond(201, "Provider service created successfully", providerService);
});

// ##########----------Create Provider Service For AI Model----------##########
const createProviderServiceForAiModel = asyncHandler(async (req, res) => {
    const { userId, serviceId, pricePerDay } = req.body;

    if (!serviceId || !pricePerDay) {
        return res.respond(400, "serviceId and pricePerDay are required!");
    }

    let user = await prisma.provider.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerService = await prisma.providerService.create({
        data: {
            providerId: user.userId,
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
        where: { providerId: userId, isDeleted: false },
        include: {
            service: true,
        },
    });

    res.respond(200, "Provider services fetched successfully", providerServices);
});

// ##########----------Get All Provider Service For Ai Model----------##########
const getAllProviderServicesForAiModel = asyncHandler(async (req, res) => {
    const { userId, search } = req.query;

    const provider = await prisma.provider.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!provider) {
        return res.respond(404, "Provider not found!");
    }

    const providerServices = await prisma.providerService.findMany({
        where: {
            providerId: provider.userId,
            isDeleted: false,
            service: search
                ? {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                    description: {
                        contains: search,
                        mode: "insensitive",
                    },
                }
                : undefined,
        },
        include: {
            service: true,
        },
    });

    res.respond(200, "Provider services fetched successfully", providerServices);
});

// ##########----------Get All Provider Services For Customer----------##########
const getAllProviderServicesForCustomer = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    let user = await prisma.provider.findFirst({
        where: { id: providerId, isDeleted: false },
    });
    if (!user) {
        return res.respond(404, "Provider not found!");
    }

    const providerServices = await prisma.providerService.findMany({
        where: { providerId: user.userId, isDeleted: false },
        include: {
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
    createProviderServiceForAiModel,
    getAllProviderServices,
    getAllProviderServicesForAiModel,
    getAllProviderServicesForCustomer,
    updateProviderService,
    deleteProviderService,
};
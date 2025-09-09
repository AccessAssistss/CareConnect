const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Service Category----------##########
const createServiceCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.respond(400, "Category name is required!");

    const category = await prisma.serviceCategory.create({
        data: { name },
    });

    res.respond(201, "Service category created successfully", category);
});

// ##########----------Get All Service Categories----------##########
const getAllServiceCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.serviceCategory.findMany({
        where: { isDeleted: false },
        include: { services: true },
    });

    res.respond(200, "Service categories fetched successfully", categories);
});

// ##########----------Get Single Service Category----------##########
const getServiceCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: { services: true },
    });

    if (!category) return res.respond(404, "Service category not found");

    res.respond(200, "Service category fetched successfully", category);
});

// ##########----------Update Service Category----------##########
const updateServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const category = await prisma.serviceCategory.update({
        where: { id },
        data: { name },
    });

    res.respond(200, "Service category updated successfully", category);
});

// ##########----------Soft Delete Service Category----------##########
const deleteServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await prisma.serviceCategory.update({
        where: { id },
        data: { isDeleted: true },
    });

    res.respond(200, "Service category soft deleted successfully", category);
});

/* ####################--------------------Service CRUD--------------------#################### */
// ##########----------Create Service----------##########
const createService = asyncHandler(async (req, res) => {
    const { categoryId, name, description } = req.body;

    if (!categoryId || !name) {
        return res.respond(400, "categoryId and name are required!");
    }

    const service = await prisma.service.create({
        data: { categoryId, name, description },
    });

    res.respond(201, "Service created successfully", service);
});

// ##########----------Get All Services----------##########
const getAllServices = asyncHandler(async (req, res) => {
    const services = await prisma.service.findMany({
        where: { isDeleted: false },
        include: { category: true },
    });

    res.respond(200, "Services fetched successfully", services);
});

// ##########----------Get All Services By Category----------##########
const getAllServicesByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        return res.respond(400, "categoryId is required!");
    }

    const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId, isDeleted: false },
    });

    if (!category) {
        return res.respond(404, "Service category not found");
    }

    const services = await prisma.service.findMany({
        where: { categoryId, isDeleted: false },
        include: { category: true },
    });

    res.respond(200, "Services fetched successfully", services);
});

// ##########----------Get Single Service----------##########
const getServiceById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
        where: { id },
        include: { category: true },
    });

    if (!service) return res.respond(404, "Service not found");

    res.respond(200, "Service fetched successfully", service);
});

// ##########----------Update Service----------##########
const updateService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, categoryId } = req.body;

    const service = await prisma.service.update({
        where: { id },
        data: { name, description, categoryId },
    });

    res.respond(200, "Service updated successfully", service);
});

// ##########----------Soft Delete Service----------##########
const deleteService = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const service = await prisma.service.update({
        where: { id },
        data: { isDeleted: true },
    });

    res.respond(200, "Service soft deleted successfully", service);
});

module.exports = {
    createServiceCategory,
    getAllServiceCategories,
    getServiceCategoryById,
    updateServiceCategory,
    deleteServiceCategory,
    createService,
    getAllServices,
    getAllServicesByCategory,
    getServiceById,
    updateService,
    deleteService,
};

const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Company Profile----------##########
const completeCompanyProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { companyName, email, mobile, address, countryId, stateId, pincode, gst } = req.body;

    let user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) {
        return res.respond(404, "Company not found!")
    }

    const company = await prisma.company.update({
        where: { userId },
        data: {
            companyName,
            email,
            mobile,
            address,
            countryId,
            stateId,
            pincode,
            gst,
            isExistingUser: true
        },
    });

    res.respond(200, "Company profile updated successfully", company);
});

// ##########----------Toggle Company Online Status----------##########
const toggleCompanyOnlineStatus = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
        return res.respond(400, "isOnline must be true or false");
    }

    const company = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!company) {
        return res.respond(404, "Company not found");
    }

    const updatedCompany = await prisma.company.update({
        where: { id: company.id },
        data: { isOnline },
    });

    res.respond(200, "Company online status updated", updatedCompany);
});

// ##########----------Get Company Profile----------##########
const getCompanyProfile = asyncHandler(async (req, res) => {
    const userId = req.user;

    const company = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
        select: {
            id: true,
            companyName: true,
            email: true,
            address: true,
            pincode: true,
            gst: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!company) {
        return res.respond(404, "Company profile not found");
    }

    res.respond(200, "Company profile fetched successfully", company);
});

// ##########----------Get Company Profile By ID----------##########
const getCompanyProfileByID = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const company = await prisma.company.findFirst({
        where: { id, isDeleted: false },
        select: {
            id: true,
            companyName: true,
            email: true,
            address: true,
            pincode: true,
            gst: true,
            createdAt: true,
            updatedAt: true,
            isOnline: true,
        },
    });

    if (!company) {
        return res.respond(404, "Company profile not found");
    }

    res.respond(200, "Company profile fetched successfully", company);
});

// ##########----------Get Online Companies (For Customer)----------##########
const getOnlineCompanies = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { search = "", page = 1, limit = 10, serviceCategoryId, serviceId } = req.query;

    const customer = await prisma.customer.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(403, "Customer not found!");
    }

    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition = {
        isOnline: true,
        isDeleted: false,
        OR: search
            ? [
                { companyName: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { pincode: { contains: search, mode: "insensitive" } },
            ]
            : undefined,
        AND: [],
    };

    if (serviceCategoryId) {
        whereCondition.AND.push({
            user: {
                companyService: {
                    some: {
                        isDeleted: false,
                        service: {
                            categoryId: serviceCategoryId,
                            isDeleted: false,
                        },
                    },
                },
            },
        });
    }

    if (serviceId) {
        whereCondition.AND.push({
            user: {
                companyService: {
                    some: {
                        isDeleted: false,
                        serviceId: serviceId,
                    },
                },
            },
        });
    }

    const companiesRaw = await prisma.company.findMany({
        where: whereCondition,
        select: {
            id: true,
            companyName: true,
            email: true,
            mobile: true,
            address: true,
            pincode: true,
            gst: true,
            isOnline: true,
            review: {
                select: { rating: true },
            },
            user: {
                select: {
                    companyService: {
                        where: { isDeleted: false },
                        select: {
                            service: {
                                select: {
                                    category: {
                                        select: { id: true, name: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        skip,
        take: Number(limit),
    });

    const companies = companiesRaw.map(company => {
        const ratings = company.review.map(r => r.rating);
        const avgRating =
            ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                : 0;

        const categories =
            company.user?.companyService
                ?.map((cs) => cs.service?.category)
                .filter((c) => c) || [];

        const uniqueCategories = Array.from(
            new Map(categories.map((c) => [c.id, c])).values()
        );

        const { review, user, ...rest } = company;
        return { ...rest, avgRating: Number(avgRating.toFixed(1)), serviceCategories: uniqueCategories };
    });

    const totalCount = await prisma.company.count({
        where: whereCondition,
    });

    res.respond(200, "Online companies fetched successfully", {
        pagination: {
            total: totalCount,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        companies,
    });
});

// ##########----------Get Online Companies For Web----------##########
const getOnlineCompaniesForWeb = asyncHandler(async (req, res) => {
    const { search = "", page = 1, limit = 10, serviceCategoryId, serviceId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereCondition = {
        isOnline: true,
        isDeleted: false,
        OR: search
            ? [
                { companyName: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { pincode: { contains: search, mode: "insensitive" } },
            ]
            : undefined,
        AND: [],
    };

    if (serviceCategoryId) {
        whereCondition.AND.push({
            user: {
                companyService: {
                    some: {
                        isDeleted: false,
                        service: {
                            categoryId: serviceCategoryId,
                            isDeleted: false,
                        },
                    },
                },
            },
        });
    }

    if (serviceId) {
        whereCondition.AND.push({
            user: {
                companyService: {
                    some: {
                        isDeleted: false,
                        serviceId: serviceId,
                    },
                },
            },
        });
    }

    const companiesRaw = await prisma.company.findMany({
        where: whereCondition,
        select: {
            id: true,
            companyName: true,
            email: true,
            mobile: true,
            address: true,
            pincode: true,
            gst: true,
            isOnline: true,
            review: {
                select: { rating: true },
            },
            user: {
                select: {
                    companyService: {
                        where: { isDeleted: false },
                        select: {
                            service: {
                                select: {
                                    category: {
                                        select: { id: true, name: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        skip,
        take: Number(limit),
    });

    const companies = companiesRaw.map(company => {
        const ratings = company.review.map(r => r.rating);
        const avgRating =
            ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                : 0;

        const categories =
            company.user?.companyService
                ?.map((cs) => cs.service?.category)
                .filter((c) => c) || [];

        const uniqueCategories = Array.from(
            new Map(categories.map((c) => [c.id, c])).values()
        );

        const { review, user, ...rest } = company;
        return { ...rest, avgRating: Number(avgRating.toFixed(1)), serviceCategories: uniqueCategories };
    });

    const totalCount = await prisma.company.count({
        where: whereCondition,
    });

    res.respond(200, "Online companies fetched successfully", {
        pagination: {
            total: totalCount,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        companies,
    });
});

module.exports = {
    completeCompanyProfile,
    toggleCompanyOnlineStatus,
    getCompanyProfile,
    getCompanyProfileByID,
    getOnlineCompanies,
    getOnlineCompaniesForWeb
}
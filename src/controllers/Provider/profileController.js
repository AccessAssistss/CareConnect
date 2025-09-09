const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Provider Profile----------##########
const completeProviderProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, proficiency, skillVerification, language, dob, address, countryId, stateId, pincode, skills = [] } = req.body;
    let parsedSkills = [];
    if (skills) {
        try {
            parsedSkills = Array.isArray(skills) ? skills : JSON.parse(skills);
        } catch (err) {
            parsedSkills = [skills];
        }
    }

    const user = await prisma.customUser.findFirst({ where: { id: userId } });
    if (!user) return res.respond(404, "User not found!");

    let provider = await prisma.provider.findFirst({ where: { userId } });
    if (!provider) {
        return res.respond(404, "Provider profile not found!");
    }

    const govtIDFile = req.files?.govtID?.[0];
    const certificationFile = req.files?.certification?.[0];

    const govtIDUrl = govtIDFile
        ? `/uploads/provider/govt_id/${govtIDFile.filename}`
        : null;
    const certificationUrl = certificationFile
        ? `/uploads/provider/certification/${certificationFile.filename}`
        : null;

    const result = await prisma.$transaction(async (tx) => {
        const updatedProvider = await tx.provider.update({
            where: { userId },
            data: {
                name,
                email,
                gender,
                proficiency,
                skillVerification,
                language,
                dob: dob ? new Date(dob) : null,
                address,
                countryId,
                stateId,
                pincode,
                isExistingUser: true,
            },
        });

        if (parsedSkills.length > 0) {
            await tx.providerSkill.updateMany({
                where: { providerId: updatedProvider.id },
                data: { isDeleted: true },
            });

            const skillData = parsedSkills.map((skillId) => ({
                providerId: updatedProvider.id,
                skillId,
            }));

            await tx.providerSkill.createMany({
                data: skillData,
                skipDuplicates: true,
            });
        }

        if (govtIDUrl || certificationUrl) {
            const existingDoc = await tx.providerDocument.findFirst({
                where: { providerId: updatedProvider.id },
            });

            if (existingDoc) {
                await tx.providerDocument.update({
                    where: { id: existingDoc.id },
                    data: {
                        ...(govtIDUrl && { govtID: govtIDUrl, govtIDVerified: false }),
                        ...(certificationUrl && { certification: certificationUrl, certificationVerified: false }),
                    },
                });
            } else {
                await tx.providerDocument.create({
                    data: {
                        providerId: updatedProvider.id,
                        name: "Provider Documents",
                        govtID: govtIDUrl || null,
                        certification: certificationUrl || null,
                        govtIDVerified: false,
                        certificationVerified: false,
                    },
                });
            }
        }

        return tx.provider.findFirst({
            where: { id: updatedProvider.id },
            include: {
                providerSkill: { include: { skill: true } },
                providerDocument: true,
            },
        });
    });

    res.respond(200, "Provider profile updated successfully", result);
});

// ##########----------Toggle Provider Online Status----------##########
const toggleProviderOnlineStatus = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
        return res.respond(400, "isOnline must be true or false");
    }

    const provider = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!provider) {
        return res.respond(404, "Provider not found");
    }

    const updatedProvider = await prisma.provider.update({
        where: { id: provider.id },
        data: { isOnline },
    });

    res.respond(200, "Provider online status updated", updatedProvider);
});

// ##########----------Get Provider Profile----------##########
const getProviderProfile = asyncHandler(async (req, res) => {
    const userId = req.user;

    const provider = await prisma.provider.findFirst({
        where: { userId, isDeleted: false },
        select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            gender: true,
            proficiency: true,
            skillVerification: true,
            language: true,
            dob: true,
            address: true,
            pincode: true,
            isOnline: true,
            providerSkill: {
                where: { isDeleted: false },
                include: {
                    skill: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            providerDocument: {
                where: { isDeleted: false },
                select: {
                    id: true,
                    name: true,
                    govtID: true,
                    certification: true,
                    govtIDVerified: true,
                    certificationVerified: true,
                },
            },
        },
    });

    if (!provider) {
        return res.respond(404, "Provider profile not found");
    }

    res.respond(200, "Provider profile fetched successfully", provider);
});

// ##########----------Get Provider Profile By ID----------##########
const getProviderProfileById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const provider = await prisma.provider.findFirst({
        where: { id, isDeleted: false },
        select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            gender: true,
            proficiency: true,
            skillVerification: true,
            language: true,
            dob: true,
            address: true,
            pincode: true,
            isOnline: true,
            providerSkill: {
                where: { isDeleted: false },
                include: {
                    skill: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!provider) {
        return res.respond(404, "Provider profile not found");
    }

    res.respond(200, "Provider profile fetched successfully", provider);
});

// ##########----------Get Online Providers (For Customer)----------##########
const getOnlineProviders = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { search = "", page = 1, limit = 10, serviceCategoryId, serviceId, skillIds } = req.query;

    const customer = await prisma.customer.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(403, "Customer not found!");
    }
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
        isOnline: true,
        isDeleted: false,
        OR: search
            ? [
                { name: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { pincode: { contains: search, mode: "insensitive" } },
            ]
            : undefined,
        AND: [],
    };

    if (serviceCategoryId) {
        whereClause.AND.push({
            user: {
                providerService: {
                    some: {
                        isDeleted: false,
                        service: {
                            categoryId: serviceCategoryId,
                            isDeleted: false,
                        },
                    },
                },
            }
        });
    }

    if (serviceId) {
        whereClause.AND.push({
            user: {
                providerService: {
                    some: {
                        isDeleted: false,
                        serviceId: serviceId,
                    },
                },
            }
        });
    }

    if (skillIds) {
        const skillsArray = Array.isArray(skillIds) ? skillIds : skillIds.split(",");
        whereClause.AND.push({
            providerSkill: {
                some: {
                    skillId: { in: skillsArray },
                    isDeleted: false,
                },
            },
        });
    }

    let providers = await prisma.provider.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            gender: true,
            proficiency: true,
            skillVerification: true,
            language: true,
            dob: true,
            address: true,
            pincode: true,
            isOnline: true,
            review: {
                where: { isDeleted: false },
                select: { rating: true }
            },
            user: {
                select: {
                    providerService: {
                        where: { isDeleted: false },
                        select: {
                            service: {
                                select: {
                                    category: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
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

    providers = providers.map(p => {
        const ratings = p.review.map(r => r.rating);
        const avgRating = ratings.length
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
            : null;

        const categories =
            p.user?.providerService
                ?.map((ps) => ps.service?.category)
                .filter((c) => c) || [];

        const uniqueCategories = Array.from(
            new Map(categories.map((c) => [c.id, c])).values()
        );

        const { review, user, ...rest } = p;
        return {
            ...rest,
            avgRating,
            serviceCategories: uniqueCategories,
        };
    });

    const totalCount = await prisma.provider.count({
        where: whereClause
    });

    res.respond(200, "Online providers fetched successfully", {
        pagination: {
            total: totalCount,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        providers,
    });
});

// ##########----------Get Online Providers For Web----------##########
const getOnlineProvidersForWeb = asyncHandler(async (req, res) => {
    const { search = "", page = 1, limit = 10, serviceCategoryId, serviceId, skillIds } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereClause = {
        isOnline: true,
        isDeleted: false,
        OR: search
            ? [
                { name: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
                { pincode: { contains: search, mode: "insensitive" } },
            ]
            : undefined,
        AND: [],
    };

    if (serviceCategoryId) {
        whereClause.AND.push({
            user: {
                providerService: {
                    some: {
                        isDeleted: false,
                        service: {
                            categoryId: serviceCategoryId,
                            isDeleted: false,
                        },
                    },
                },
            }
        });
    }

    if (serviceId) {
        whereClause.AND.push({
            user: {
                providerService: {
                    some: {
                        isDeleted: false,
                        serviceId: serviceId,
                    },
                },
            }
        });
    }

    if (skillIds) {
        const skillsArray = Array.isArray(skillIds) ? skillIds : skillIds.split(",");
        whereClause.AND.push({
            providerSkill: {
                some: {
                    skillId: { in: skillsArray },
                    isDeleted: false,
                },
            },
        });
    }

    let providers = await prisma.provider.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            gender: true,
            proficiency: true,
            skillVerification: true,
            language: true,
            dob: true,
            address: true,
            pincode: true,
            isOnline: true,
            review: {
                where: { isDeleted: false },
                select: { rating: true }
            },
            user: {
                select: {
                    providerService: {
                        where: { isDeleted: false },
                        select: {
                            service: {
                                select: {
                                    category: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
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

    providers = providers.map(p => {
        const ratings = p.review.map(r => r.rating);
        const avgRating = ratings.length
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
            : null;

        const categories =
            p.user?.providerService
                ?.map((ps) => ps.service?.category)
                .filter((c) => c) || [];

        const uniqueCategories = Array.from(
            new Map(categories.map((c) => [c.id, c])).values()
        );

        const { review, user, ...rest } = p;
        return {
            ...rest,
            avgRating,
            serviceCategories: uniqueCategories,
        };
    });

    const totalCount = await prisma.provider.count({
        where: whereClause
    });

    res.respond(200, "Online providers fetched successfully", {
        pagination: {
            total: totalCount,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        providers,
    });
});

// ##########----------Create Provider (with User, Skills & Services)----------##########
const createProvider = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        mobile,
        gender,
        proficiency,
        skillVerification,
        language,
        dob,
        address,
        countryId,
        stateId,
        pincode,
        skills = [],
        services = []
    } = req.body;

    let parsedSkills = [];
    if (skills) {
        try {
            parsedSkills = Array.isArray(skills) ? skills : JSON.parse(skills);
        } catch (err) {
            parsedSkills = [skills];
        }
    }

    let parsedServices = [];
    if (services) {
        try {
            parsedServices = Array.isArray(services) ? services : JSON.parse(services);
        } catch (err) {
            parsedServices = [];
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.customUser.create({
            data: {
                name,
                email,
                mobile,
                userType: "Provider",
            },
        });

        const newProvider = await tx.provider.create({
            data: {
                userId: newUser.id,
                name,
                email,
                mobile,
                gender,
                proficiency,
                skillVerification,
                language,
                dob: dob ? new Date(dob) : null,
                address,
                countryId,
                stateId,
                pincode,
                isExistingUser: true,
                isOnline: true
            },
        });

        if (parsedSkills.length > 0) {
            const skillData = parsedSkills.map((skillId) => ({
                providerId: newProvider.id,
                skillId,
            }));

            await tx.providerSkill.createMany({
                data: skillData,
                skipDuplicates: true,
            });
        }

        if (parsedServices.length > 0) {
            const serviceData = parsedServices.map((svc) => ({
                providerId: newUser.id,
                serviceId: svc.serviceId,
                pricePerDay: parseFloat(svc.pricePerDay) || 0,
            }));

            await tx.providerService.createMany({
                data: serviceData,
                skipDuplicates: true,
            });
        }

        return tx.provider.findFirst({
            where: { id: newProvider.id },
            include: {
                user: true,
                providerSkill: { include: { skill: true } },
            },
        });
    });

    res.respond(201, "Provider created successfully", result);
});

module.exports = {
    completeProviderProfile,
    toggleProviderOnlineStatus,
    getProviderProfile,
    getProviderProfileById,
    getOnlineProviders,
    getOnlineProvidersForWeb,
    createProvider
}
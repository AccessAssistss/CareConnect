const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Provider Profile----------##########
const completeProviderProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, dob, address, countryId, stateId, pincode, skills = [] } = req.body;

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
                dob: dob ? new Date(dob) : null,
                address,
                countryId,
                stateId,
                pincode,
                isExistingUser: true,
            },
        });

        if (skills.length > 0) {
            await tx.providerSkill.updateMany({
                where: { providerId: updatedProvider.id },
                data: { isDeleted: true },
            });

            const skillData = skills.map((skillId) => ({
                providerId: updatedProvider.id,
                skillId,
            }));

            await tx.providerSkill.createMany({
                data: skillData,
                skipDuplicates: true,
            });
        }

        if (documents.govtID || documents.certification) {
            await tx.providerDocument.updateMany({
                where: { providerId: updatedProvider.id },
                data: { isDeleted: true },
            });

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

        return tx.provider.findFirst({
            where: { id: updatedProvider.id },
            include: {
                skills: { include: { skill: true } },
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

// ##########----------Get Online Providers (For Customer)----------##########
const getOnlineProviders = asyncHandler(async (req, res) => {
    const userId = req.user;

    const customer = await prisma.customer.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!customer) {
        return res.respond(403, "Customer not found!");
    }

    const providers = await prisma.provider.findMany({
        where: { isOnline: true, isDeleted: false },
        select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            gender: true,
            dob: true,
            address: true,
            pincode: true,
        },
    });

    res.respond(200, "Online providers fetched successfully", providers);
});

module.exports = {
    completeProviderProfile,
    toggleProviderOnlineStatus,
    getOnlineProviders
}
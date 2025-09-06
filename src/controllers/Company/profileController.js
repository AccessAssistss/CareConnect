const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Company Profile----------##########
const completeCompanyProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { companyName, email, mobile, address, countryId, stateId, pincode } = req.body;

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

// ##########----------Get Online Companies (For Customer)----------##########
const getOnlineCompanies = asyncHandler(async (req, res) => {
    const userId = req.user;

    const customer = await prisma.customer.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!customer) {
        return res.respond(403, "Customer not found!");
    }

    const companies = await prisma.company.findMany({
        where: { isOnline: true, isDeleted: false },
        select: {
            id: true,
            companyName: true,
            email: true,
            mobile: true,
            address: true,
            pincode: true,
        },
    });

    res.respond(200, "Online companies fetched successfully", companies);
});

module.exports = {
    completeCompanyProfile,
    toggleCompanyOnlineStatus,
    getOnlineCompanies
}
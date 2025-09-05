const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Company Profile----------##########
const completeCompanyProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { companyName, email, mobile, address, countryId, stateId, pincode } = req.body;

    let user = await prisma.customUser.findFirst({
        where: { mobile, userType },
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
        },
    });

    res.respond(200, "Company profile updated successfully", company);
});

module.exports = {
    completeCompanyProfile
}
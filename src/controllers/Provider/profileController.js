const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Provider Profile----------##########
const completeProviderProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, dob, address, countryId, stateId, pincode } = req.body;

    let user = await prisma.customUser.findFirst({
        where: { mobile, userType },
    });
    if (!user) {
        return res.respond(404, "Provider not found!")
    }

    const provider = await prisma.customer.update({
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
        },
    });

    res.respond(200, "Provider profile updated successfully", provider);
});

module.exports = {
    completeProviderProfile
}
const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Staff Profile----------##########
const completeStaffProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, dob, address, countryId, stateId, pincode } = req.body;

    let user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) {
        return res.respond(404, "Staff not found!")
    }

    const staff = await prisma.staff.update({
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
            isExistingUser: true
        },
    });

    res.respond(200, "Staff profile updated successfully", staff);
});

module.exports = {
    completeStaffProfile
}
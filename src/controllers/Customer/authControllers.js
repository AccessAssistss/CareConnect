const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
    generateOTP,
    sendOTP,
    validateOTP,
} = require("../../../utils/otpUtils");
const {
    generateAccessToken,
    generateRefreshToken,
} = require("../../../utils/authUtils");

const prisma = new PrismaClient();

// ###############---------------Generate Access And Refresh Token---------------###############
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await prisma.customUser.findFirst({ where: { id: userId } });

        if (!user) {
            throw new Error("User not found");
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.customUser.update({
            where: { id: userId },
            data: { refreshToken },
        });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new Error("Something went wrong while generating tokens");
    }
};

// ##########----------Send OTP----------##########
const sendLoginOTP = asyncHandler(async (req, res) => {
    const { userType, mobile } = req.body;

    if (!mobile || !userType) {
        return res.respond(400, "Mobile and userType are required!");
    }

    const otp = await generateOTP();

    let user = await prisma.customUser.findFirst({
        where: { mobile, userType },
    });
    if (!user) {
        user = await prisma.customUser.create({
            data: { mobile, userType },
        });
    }

    let profileModel;
    if (userType === "Customer") profileModel = prisma.customer;
    if (userType === "Company") profileModel = prisma.company;
    if (userType === "Staff") profileModel = prisma.staff;
    if (userType === "Provider") profileModel = prisma.provider;

    if (!profileModel) {
        return res.respond(400, "Invalid userType!");
    }

    let profile = await profileModel.findFirst({ where: { userId: user.id } });

    if (!profile) {
        profile = await profileModel.create({
            data: {
                userId: user.id,
                mobile,
                otp,
                otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
            },
        });
    } else {
        await profileModel.update({
            where: { id: profile.id },
            data: {
                otp,
                otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
            },
        });
    }

    const sent = await sendOTP(mobile, otp);
    if (!sent) {
        return res.respond(500, "Failed to send OTP");
    }

    res.respond(200, `OTP sent to ${mobile}!`, { otp });
});

// ##########----------Verify OTP (All Users)----------##########
const verifyOTP = asyncHandler(async (req, res) => {
    const { mobile, userType, otp } = req.body;

    if (!mobile || !userType || !otp) {
        return res.respond(400, "Mobile, userType, and otp are required!");
    }

    const user = await prisma.customUser.findFirst({
        where: { mobile, userType },
    });

    if (!user) return res.respond(404, "User not found!");

    let profileModel;
    if (userType === "Customer") profileModel = prisma.customer;
    if (userType === "Company") profileModel = prisma.company;
    if (userType === "Staff") profileModel = prisma.staff;
    if (userType === "Provider") profileModel = prisma.provider;

    const profile = await profileModel.findFirst({ where: { userId: user.id } });
    if (!profile) return res.respond(404, "Profile not found!");

    if (
        profile.otp !== otp ||
        !profile.otpExpiration ||
        new Date() > profile.otpExpiration
    ) {
        return res.respond(400, "Invalid or expired OTP!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user.id
    );

    await profileModel.update({
        where: { id: profile.id },
        data: { otp: null, otpExpiration: null },
    });

    res.respond(200, "Login successful!", {
        user: {
            id: user.id,
            mobile: user.mobile,
            userType: user.userType,
        },
        tokens: { accessToken, refreshToken },
    });
});

// ##########----------Complete Customer Profile----------##########
const completeCustomerProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, dob, address, countryId, stateId, pincode } = req.body;

    let user = await prisma.customUser.findFirst({
        where: { mobile, userType },
    });
    if (!user) {
        return res.respond(404, "Customer not found!")
    }

    const customer = await prisma.customer.update({
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

    res.respond(200, "Customer profile updated successfully", customer);
});

module.exports = {
    sendLoginOTP,
    verifyOTP,
    completeCustomerProfile
}
const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Staff Profile----------##########
const completeStaffProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, companyId, proficiency, skillVerification, language, dob, address, countryId, stateId, pincode, skills = [] } = req.body;
    let parsedSkills = [];
    if (skills) {
        try {
            parsedSkills = JSON.parse(skills);
        } catch (err) {
            parsedSkills = [skills];
        }
    }

    let user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) {
        return res.respond(404, "User not found!")
    }

    let staff = await prisma.staff.findFirst({ where: { userId } });
    if (!staff) {
        return res.respond(404, "Staff profile not found!");
    }

    const govtIDFile = req.files?.govtID?.[0];
    const certificationFile = req.files?.certification?.[0];

    const govtIDUrl = govtIDFile
        ? `/uploads/staff/govt_id/${govtIDFile.filename}`
        : null;
    const certificationUrl = certificationFile
        ? `/uploads/staff/certification/${certificationFile.filename}`
        : null;

    const result = await prisma.$transaction(async (tx) => {
        updatedStaff = await tx.staff.update({
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
                companyId
            },
        });

        if (parsedSkills.length > 0) {
            await tx.staffSkill.updateMany({
                where: { staffId: updatedStaff.id },
                data: { isDeleted: true },
            });

            const skillData = parsedSkills.map((skillId) => ({
                staffId: updatedStaff.id,
                skillId,
            }));

            await tx.staffSkill.createMany({
                data: skillData,
                skipDuplicates: true,
            });
        }

        if (govtIDUrl || certificationUrl) {
            await tx.staffDocument.updateMany({
                where: { staffId: updatedStaff.id },
                data: { isDeleted: true },
            });

            await tx.staffDocument.create({
                data: {
                    staffId: updatedStaff.id,
                    name: "Staff Documents",
                    govtID: govtIDUrl || null,
                    certification: certificationUrl || null,
                    govtIDVerified: false,
                    certificationVerified: false,
                },
            });
        }

        return tx.staff.findFirst({
            where: { id: updatedStaff.id },
            include: {
                staffSkill: { include: { skill: true } },
                staffDocument: true,
            },
        });
    });

    res.respond(200, "Staff profile updated successfully", result);
});

// ##########----------Get Staff Profile----------##########
const getStaffProfile = asyncHandler(async (req, res) => {
    const userId = req.user;

    const staff = await prisma.staff.findFirst({
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
            staffSkill: {
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
            staffDocument: {
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

    if (!staff) {
        return res.respond(404, "Staff profile not found");
    }

    res.respond(200, "Staff profile fetched successfully", staff);
});

// ##########----------Get Staff Profile By ID----------##########
const getStaffProfileByID = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const staff = await prisma.staff.findFirst({
        where: { id, isDeleted: false },
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
            staffSkill: {
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
            staffDocument: {
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

    if (!staff) {
        return res.respond(404, "Staff profile not found");
    }

    res.respond(200, "Staff profile fetched successfully", staff);
});

// ##########----------Get Staffs By Company----------##########
const getStaffsByCompany = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { search = "", page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

     const company = await prisma.company.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!company) {
        return res.respond(404, "Company not found for this user");
    }

    const whereClause = {
        companyId: company.id,
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

    let staffs = await prisma.staff.findMany({
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
        },
        skip,
        take: Number(limit),
    });

    const totalCount = await prisma.staff.count({
        where: whereClause
    });

    res.respond(200, "Staffs fetched successfully", {
        pagination: {
            total: totalCount,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        staffs,
    });
});

module.exports = {
    completeStaffProfile,
    getStaffProfile,
    getStaffProfileByID,
    getStaffsByCompany
}
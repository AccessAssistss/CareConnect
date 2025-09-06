const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Complete Staff Profile----------##########
const completeStaffProfile = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { name, email, gender, dob, address, countryId, stateId, pincode, skills = [] } = req.body;
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
                dob: dob ? new Date(dob) : null,
                address,
                countryId,
                stateId,
                pincode,
                isExistingUser: true
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

module.exports = {
    completeStaffProfile
}
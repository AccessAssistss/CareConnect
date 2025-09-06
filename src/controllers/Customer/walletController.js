const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Helper to get Wallet Owner----------##########
const getWalletOwner = async (userId) => {
    const user = await prisma.customUser.findFirst({ where: { id: userId } });
    if (!user) return { type: null, owner: null };

    let owner = null;
    if (user.userType === "Customer") {
        owner = await prisma.customer.findFirst({ where: { userId, isDeleted: false } });
        return { type: "Customer", owner };
    }
    if (user.userType === "Provider") {
        owner = await prisma.provider.findFirst({ where: { userId, isDeleted: false } });
        return { type: "Provider", owner };
    }
    if (user.userType === "Company") {
        owner = await prisma.company.findFirst({ where: { userId, isDeleted: false } });
        return { type: "Company", owner };
    }

    return { type: null, owner: null };
};

// ##########----------Get Wallet Balance----------##########
const getWallet = asyncHandler(async (req, res) => {
    const userId = req.user;

    const { type, owner } = await getWalletOwner(userId);
    if (!owner) return res.respond(404, `${type || "User"} not found!`);

    let wallet = await prisma.wallet.findFirst({
        where: {
            ...(type === "Customer" && { customerId: owner.id }),
            ...(type === "Provider" && { providerId: owner.id }),
            ...(type === "Company" && { companyId: owner.id }),
        },
    });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: {
                balance: 0,
                ...(type === "Customer" && { customerId: owner.id }),
                ...(type === "Provider" && { providerId: owner.id }),
                ...(type === "Company" && { companyId: owner.id }),
            },
        });
    }

    res.respond(200, "Wallet fetched successfully", wallet);
});

// ##########----------Add Money to Wallet----------##########
const addMoney = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { amount, description = "Wallet Top-up" } = req.body;

    if (!amount || amount <= 0) return res.respond(400, "Invalid amount!");

    const { type, owner } = await getWalletOwner(userId);
    if (!owner) return res.respond(404, `${type || "User"} not found!`);

    let wallet = await prisma.wallet.findFirst({
        where: {
            ...(type === "Customer" && { customerId: owner.id }),
            ...(type === "Provider" && { providerId: owner.id }),
            ...(type === "Company" && { companyId: owner.id }),
        },
    });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: {
                balance: 0,
                ...(type === "Customer" && { customerId: owner.id }),
                ...(type === "Provider" && { providerId: owner.id }),
                ...(type === "Company" && { companyId: owner.id }),
            },
        });
    }

    const updated = await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance + amount },
    });

    await prisma.walletTransaction.create({
        data: {
            walletId: wallet.id,
            type: "CREDIT",
            amount,
            description,
        },
    });

    res.respond(200, "Money added successfully!", updated);
});

// ##########----------Deduct Money from Wallet----------##########
const deductMoney = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { amount, description = "Wallet Debit" } = req.body;

    if (!amount || amount <= 0) return res.respond(400, "Invalid amount!");

    const { type, owner } = await getWalletOwner(userId);
    if (!owner) return res.respond(404, `${type || "User"} not found!`);

    const wallet = await prisma.wallet.findFirst({
        where: {
            ...(type === "Customer" && { customerId: owner.id }),
            ...(type === "Provider" && { providerId: owner.id }),
            ...(type === "Company" && { companyId: owner.id }),
        },
    });

    if (!wallet) return res.respond(404, "Wallet not found!");
    if (wallet.balance < amount) return res.respond(400, "Insufficient balance!");

    const updated = await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - amount },
    });

    await prisma.walletTransaction.create({
        data: {
            walletId: wallet.id,
            type: "DEBIT",
            amount,
            description,
        },
    });

    res.respond(200, "Money deducted successfully!", updated);
});

// ##########----------Get Wallet Transactions----------##########
const getTransactions = asyncHandler(async (req, res) => {
    const userId = req.user;

    const { type, owner } = await getWalletOwner(userId);
    if (!owner) return res.respond(404, `${type || "User"} not found!`);

    const wallet = await prisma.wallet.findFirst({
        where: {
            ...(type === "Customer" && { customerId: owner.id }),
            ...(type === "Provider" && { providerId: owner.id }),
            ...(type === "Company" && { companyId: owner.id }),
        },
    });

    if (!wallet) return res.respond(404, "Wallet not found!");

    const transactions = await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
    });

    res.respond(200, "Transactions fetched successfully!", transactions);
});

module.exports = {
    getWallet,
    addMoney,
    deductMoney,
    getTransactions,
};
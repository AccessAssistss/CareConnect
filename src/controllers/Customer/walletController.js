const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Get Wallet Balance----------##########
const getWallet = asyncHandler(async (req, res) => {
    const userId = req.user;

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return res.respond(404, "Customer not found!");

    let wallet = await prisma.wallet.findUnique({ where: { customerId: customer.id } });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: { customerId: customer.id, balance: 0 },
        });
    }

    res.respond(200, "Wallet fetched successfully", wallet);
});

// ##########----------Add Money to Wallet----------##########
const addMoney = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { amount, description = "Wallet Top-up" } = req.body;

    if (!amount || amount <= 0) return res.respond(400, "Invalid amount!");

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return res.respond(404, "Customer not found!");

    let wallet = await prisma.wallet.findUnique({ where: { customerId: customer.id } });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: { customerId: customer.id, balance: 0 },
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

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return res.respond(404, "Customer not found!");

    const wallet = await prisma.wallet.findUnique({ where: { customerId: customer.id } });
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

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return res.respond(404, "Customer not found!");

    const wallet = await prisma.wallet.findUnique({ where: { customerId: customer.id } });
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

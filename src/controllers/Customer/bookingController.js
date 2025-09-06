const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Helper: Get Wallet by Entity----------##########
const getWallet = async (entityType, entityId) => {
    let wallet = await prisma.wallet.findFirst({
        where: {
            ...(entityType === "Customer" && { customerId: entityId }),
            ...(entityType === "Provider" && { providerId: entityId }),
            ...(entityType === "Company" && { companyId: entityId }),
        },
    });

    if (!wallet) {
        const createData = {
            ...(entityType === "Customer" && { customerId: entityId }),
            ...(entityType === "Provider" && { providerId: entityId }),
            ...(entityType === "Company" && { companyId: entityId }),
            balance: 0,
        };
        wallet = await prisma.wallet.create({ data: createData });
    }

    return wallet;
};

// ##########----------Create Booking Request----------##########
const createBookingRequest = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { familyMemberId, providerSvcId, companySvcId, startDate, endDate } = req.body;

    if (!providerSvcId && !companySvcId) {
        return res.respond(400, "Either providerSvcId or companySvcId is required");
    }

    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return res.respond(404, "Customer not found");

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    if (end < start) {
        return res.respond(400, "endDate cannot be before startDate");
    }

    let service, pricePerDay;
    if (providerSvcId) {
        service = await prisma.providerService.findFirst({
            where: { id: providerSvcId, isDeleted: false, isActive: true },
        });
        if (!service) return res.respond(404, "Provider service not found");
        pricePerDay = service.pricePerDay;
    } else {
        service = await prisma.companyService.findFirst({
            where: { id: companySvcId, isDeleted: false, isActive: true },
        });
        if (!service) return res.respond(404, "Company service not found");
        pricePerDay = service.pricePerDay;
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const dates = Array.from({ length: days }).map((_, i) =>
        new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    );

    if (providerSvcId) {
        const conflicts = await prisma.booking.findMany({
            where: {
                request: {
                    providerSvcId,
                    status: "CONFIRMED",
                },
                date: { in: dates },
            },
        });

        if (conflicts.length > 0) {
            return res.respond(
                409,
                "Provider is already booked for one or more selected dates",
                conflicts
            );
        }
    }

    if (companySvcId) {
        const conflicts = await prisma.booking.findMany({
            where: {
                request: {
                    companySvcId,
                    status: "CONFIRMED",
                },
                date: { in: dates },
            },
        });

        if (conflicts.length > 0) {
            return res.respond(
                409,
                "This company service is already booked for one or more selected dates",
                conflicts
            );
        }
    }

    const totalAmount = pricePerDay * days;

    const result = await prisma.$transaction(async (prismaTx) => {
        let wallet = await getWallet("Customer", customer.id);
        if (!wallet) {
            wallet = await prismaTx.wallet.create({
                data: { customerId: customer.id, balance: 0 },
            });
        }

        if (wallet.balance < totalAmount) {
            return res.respond(400, "Insufficient wallet balance");
        }

        await prismaTx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance - totalAmount },
        });

        await prismaTx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: "DEBIT",
                amount: totalAmount,
                description: "Booking payment (on hold)",
            },
        });

        const bookingRequest = await prismaTx.bookingRequest.create({
            data: {
                customerId,
                familyMemberId,
                providerSvcId,
                companySvcId,
                startDate: start,
                endDate: end,
                totalAmount,
            },
        });

        const bookingsData = dates.map(date => ({
            requestId: bookingRequest.id,
            date,
            amount: pricePerDay,
        }));

        await prismaTx.booking.createMany({ data: bookingsData });

        return { bookingRequest, bookingsData };
    });

    res.respond(201, "Booking request created successfully", result);
});

// ##########----------Provider/Company Accept Booking----------##########
const acceptBookingRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { staffId } = req.body;

    const bookingRequest = await prisma.bookingRequest.findFirst({
        where: { id: requestId },
        include: { bookings: true },
    });

    if (!bookingRequest) return res.respond(404, "Booking request not found");

    if (bookingRequest.companySvcId && !staffId) {
        return res.respond(400, "StaffId is required for company booking acceptance");
    }

    const dates = bookingRequest.bookings.map(b => b.date);

    await prisma.$transaction(async (prismaTx) => {
        if (bookingRequest.providerSvcId) {
            const conflicts = await prismaTx.booking.findMany({
                where: {
                    id: { notIn: bookingRequest.bookings.map(b => b.id) },
                    request: { providerSvcId: bookingRequest.providerSvcId },
                    status: { in: ["CONFIRMED", "ASSIGNED"] },
                    date: { in: dates },
                },
            });
            if (conflicts.length > 0) {
                return res.respond(409, "Cannot accept booking. One or more selected dates are already booked", conflicts);
            }
        }

        if (bookingRequest.companySvcId && staffId) {
            const conflicts = await prismaTx.booking.findMany({
                where: {
                    id: { notIn: bookingRequest.bookings.map(b => b.id) },
                    staffId,
                    request: { companySvcId: bookingRequest.companySvcId },
                    status: { in: ["CONFIRMED", "ASSIGNED"] },
                    date: { in: dates },
                },
            });
            if (conflicts.length > 0) {
                return res.respond(409, "Cannot accept booking. One or more selected dates are already booked", conflicts);
            }
        }

        let wallet;
        if (bookingRequest.providerSvcId) {
            const providerService = await prismaTx.providerService.findFirst({
                where: { id: bookingRequest.providerSvcId },
            });
            wallet = await getWallet("Provider", providerService.providerId);
            if (!wallet) {
                wallet = await prismaTx.wallet.create({
                    data: { providerId: providerService.providerId, balance: 0 },
                });
            }
        } else {
            const companyService = await prismaTx.companyService.findFirst({
                where: { id: bookingRequest.companySvcId },
            });
            wallet = await getWallet("Company", companyService.companyId);
            if (!wallet) {
                wallet = await prismaTx.wallet.create({
                    data: { companyId: companyService.companyId, balance: 0 },
                });
            }
        }

        await prismaTx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance + bookingRequest.totalAmount },
        });

        await prismaTx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: "CREDIT",
                amount: bookingRequest.totalAmount,
                description: "Booking payment received",
            },
        });

        await prismaTx.bookingRequest.update({
            where: { id: requestId },
            data: { status: "CONFIRMED" },
        });

        await prismaTx.booking.updateMany({
            where: { requestId },
            data: { status: "CONFIRMED", ...(staffId && { staffId }) },
        });
    });

    res.respond(200, "Booking request accepted successfully");
});

// ##########----------Decline Booking----------##########
const declineBookingRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    await prisma.$transaction(async (prismaTx) => {
        const bookingRequest = await prismaTx.bookingRequest.update({
            where: { id: requestId },
            data: { status: "DECLINED" },
            include: { customer: true },
        });

        const wallet = await getWallet("Customer", bookingRequest.customerId);
        if (wallet) {
            await prismaTx.wallet.update({
                where: { id: wallet.id },
                data: { balance: wallet.balance + bookingRequest.totalAmount },
            });

            await prismaTx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "CREDIT",
                    amount: bookingRequest.totalAmount,
                    description: "Booking refund (declined)",
                },
            });
        }

        await prismaTx.booking.updateMany({
            where: { requestId },
            data: { status: "DECLINED" },
        });
    });

    res.respond(200, "Booking request declined successfully", bookingRequest);
});

// ##########----------Get Bookings for Customer----------##########
const getCustomerBookings = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const bookings = await prisma.bookingRequest.findMany({
        where: { customerId },
        include: {
            bookings: true,
            companySvc: { include: { service: true, company: true } },
            providerSvc: { include: { service: true, provider: true } },
        },
    });

    res.respond(200, "Customer bookings fetched successfully", bookings);
});

// ##########----------Get Incoming Requests for Provider/Company----------##########
const getIncomingRequests = asyncHandler(async (req, res) => {
    const userId = req.user;

    const provider = await prisma.provider.findFirst({ where: { userId } });
    if (provider) {
        const requests = await prisma.bookingRequest.findMany({
            where: { providerSvc: { providerId: provider.id } },
            include: { bookings: true, customer: true, providerSvc: { include: { service: true } } },
        });
        return res.respond(200, "Incoming provider requests fetched successfully", requests);
    }

    const company = await prisma.company.findFirst({ where: { userId } });
    if (company) {
        const requests = await prisma.bookingRequest.findMany({
            where: { companySvc: { companyId: company.id } },
            include: { bookings: true, customer: true, companySvc: { include: { service: true } } },
        });
        return res.respond(200, "Incoming company requests fetched successfully", requests);
    }

    res.respond(404, "No provider or company found for this user");
});

// ##########----------Customer Cancel Booking----------##########
const cancelBookingRequest = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { requestId } = req.params;

    const bookingRequest = await prisma.bookingRequest.findFirst({
        where: { id: requestId, customerId },
    });

    if (!bookingRequest) return res.respond(404, "Booking request not found or unauthorized");

    if (["DECLINED", "CANCELLED"].includes(bookingRequest.status)) {
        return res.respond(400, "Booking already cancelled/declined");
    }

    await prisma.$transaction(async (prismaTx) => {
        await prismaTx.bookingRequest.update({
            where: { id: requestId },
            data: { status: "CANCELLED" },
        });

        await prismaTx.booking.updateMany({
            where: { requestId },
            data: { status: "CANCELLED" },
        });

        const wallet = await getWallet("Customer", bookingRequest.customerId);
        if (wallet) {
            await prismaTx.wallet.update({
                where: { id: wallet.id },
                data: { balance: wallet.balance + bookingRequest.totalAmount },
            });

            await prismaTx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: "CREDIT",
                    amount: bookingRequest.totalAmount,
                    description: "Booking refund (cancelled)",
                },
            });
        }
    });

    res.respond(200, "Booking cancelled successfully");
});

module.exports = {
    createBookingRequest,
    acceptBookingRequest,
    declineBookingRequest,
    getCustomerBookings,
    getIncomingRequests,
    cancelBookingRequest
};
const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Helper: Get Wallet by Entity----------##########
const getWallet = async (entityType, entityId, prismaClient = prisma) => {
    let wallet = await prismaClient.wallet.findFirst({
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
        wallet = await prismaClient.wallet.create({ data: createData });
    }

    return wallet;
};

// Helper: random 4-digit code
const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

// ##########----------Create Booking Request----------##########
const createBookingRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
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
    const startCode = generateCode()
    const endCode = generateCode()

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
                customerId: customer.id,
                familyMemberId,
                providerSvcId,
                companySvcId,
                startDate: start,
                endDate: end,
                totalAmount,
                startCode,
                endCode,
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
                    status: { in: ["CONFIRMED", "ONGOING"] },
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
                    status: { in: ["CONFIRMED", "ONGOING"] },
                    date: { in: dates },
                },
            });
            if (conflicts.length > 0) {
                return res.respond(409, "Cannot accept booking. One or more selected dates are already booked", conflicts);
            }
        }

       

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

// ##########----------Start Service----------##########
const startService = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { code } = req.body;

    const bookingRequest = await prisma.bookingRequest.findFirst({
        where: { id: requestId },
    });

    if (!bookingRequest) return res.respond(404, "Booking request not found");

    if (bookingRequest.startCode !== code) {
        return res.respond(400, "Invalid start code");
    }

    if (bookingRequest.status !== "CONFIRMED") {
        return res.respond(400, "Service cannot be started in current status");
    }

    await prisma.$transaction(async (prismaTx) => {
        await prismaTx.bookingRequest.update({
            where: { id: requestId },
            data: { status: "ONGOING" },
        });

        await prismaTx.booking.updateMany({
            where: { requestId },
            data: { status: "ONGOING" },
        });
    });

    res.respond(200, "Service started successfully");
});

// ##########----------End Service----------##########
const endService = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { code } = req.body;

    const bookingRequest = await prisma.bookingRequest.findFirst({
        where: { id: requestId },
    });
    if (!bookingRequest) return res.respond(404, "Booking request not found");

    if (bookingRequest.endCode !== code) {
        return res.respond(400, "Invalid end code");
    }

    if (bookingRequest.status !== "ONGOING") {
        return res.respond(400, "Service cannot be ended in current status");
    }

    await prisma.$transaction(async (prismaTx) => {
        let wallet;

        if (bookingRequest.providerSvcId) {
            const providerService = await prismaTx.providerService.findFirst({
                where: { id: bookingRequest.providerSvcId },
            });

            const provider = await prismaTx.provider.findFirst({
                where: { userId: providerService.providerId },
            });

            wallet = await getWallet("Provider", provider.id, prismaTx);
        } else {
            const companyService = await prismaTx.companyService.findFirst({
                where: { id: bookingRequest.companySvcId },
            });
            const company = await prismaTx.company.findFirst({
                where: { userId: companyService.companyId },
            });
            wallet = await getWallet("Company", company.id, prismaTx);
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
                description: "Booking payment released",
            },
        });

        await prismaTx.bookingRequest.update({
            where: { id: requestId },
            data: { status: "COMPLETED" },
        });

        await prismaTx.booking.updateMany({
            where: { requestId },
            data: { status: "COMPLETED" },
        });
    });

    res.respond(200, "Service ended successfully and payment released");
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

    res.respond(200, "Booking request declined successfully");
});

// ##########----------Get Bookings for Customer----------##########
const getCustomerBookings = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId },
    });
    if (!customer) {
        return res.respond(404, "Customer profile not found!");
    }

    const bookings = await prisma.bookingRequest.findMany({
        where: { customerId: customer.id },
        select: {
            id: true,
            startDate: true,
            endDate: true,
            startCode: true,
            endCode: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            companySvc: {
                select: {
                    id: true,
                    pricePerDay: true,
                    service: {
                        select: { id: true, name: true },
                    },
                    company: {
                        select: {
                            company: {
                                select: {
                                    id: true,
                                    companyName: true,
                                    companyLogo: true,
                                },
                            },
                        },
                    },
                },
            },
            providerSvc: {
                select: {
                    id: true,
                    pricePerDay: true,
                    service: {
                        select: { id: true, name: true },
                    },
                    provider: {
                        select: {
                            provider: {
                                select: {
                                    id: true,
                                    name: true,
                                    profilePhoto: true,
                                },
                            },
                        },
                    },
                },
            },
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
            where: { providerSvc: { providerId: provider.userId } },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                status: true,
                customer: {
                    select: { id: true, name: true, mobile: true }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        age: true,
                        relation: true,
                        profilePhoto: true
                    }
                },
                providerSvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true, description: true } }
                    }
                },
            }
        });
        return res.respond(200, "Incoming provider requests fetched successfully", requests);
    }

    const company = await prisma.company.findFirst({ where: { userId } });
    if (company) {
        const requests = await prisma.bookingRequest.findMany({
            where: { companySvc: { companyId: company.userId } },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                status: true,
                customer: {
                    select: { id: true, name: true, mobile: true }
                },
                companySvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true, description: true } }
                    }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true,
                        gender: true,
                        age: true,
                        relation: true,
                        profilePhoto: true
                    }
                },
            }
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

// ##########----------Get Booking History----------##########
const getBookingHistory = asyncHandler(async (req, res) => {
    const userId = req.user;

    const statusFilter = {
        status: { in: ["DECLINED", "CANCELLED", "COMPLETED"] }
    };

    // Customer Booking History
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (customer) {
        const history = await prisma.bookingRequest.findMany({
            where: { customerId: customer.id, ...statusFilter },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                familyMember: {
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        profilePhoto: true
                    }
                },
                providerSvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true } },
                        provider: {
                            select: { id: true, name: true }
                        }
                    }
                },
                companySvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true } },
                        company: {
                            select: { id: true, name: true }
                        }
                    }
                },
            }
        });
        return res.respond(200, "Customer booking history fetched successfully!", history);
    }

    // Provider Booking History
    const provider = await prisma.provider.findFirst({ where: { userId } });
    if (provider) {
        const history = await prisma.bookingRequest.findMany({
            where: { providerSvc: { providerId: provider.id }, ...statusFilter },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                customer: {
                    select: { id: true, name: true, mobile: true }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        profilePhoto: true
                    }
                },
                providerSvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true } }
                    }
                },
            }
        });
        return res.respond(200, "Provider booking history fetched successfully", history);
    }

    // Company Booking History
    const company = await prisma.company.findFirst({ where: { userId } });
    if (company) {
        const history = await prisma.bookingRequest.findMany({
            where: { companySvc: { companyId: company.id }, ...statusFilter },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                customer: {
                    select: { id: true, name: true, mobile: true }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true,
                        relation: true,
                        profilePhoto: true
                    }
                },
                companySvc: {
                    select: {
                        id: true,
                        pricePerDay: true,
                        service: { select: { id: true, name: true } }
                    }
                },
            }
        });
        return res.respond(200, "Company booking history fetched successfully", history);
    }

    res.respond(404, "No booking history found for this user");
});

// ##########----------Get Staff by Booking Request----------##########
const getStaffByBookingRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const bookingRequest = await prisma.bookingRequest.findFirst({
        where: { id: requestId },
        include: {
            bookings: {
                where: { staffId: { not: null } },
                take: 1,
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            mobile: true,
                            profilePhoto: true,
                        },
                    },
                },
            },
        },
    });

    if (!bookingRequest) {
        return res.respond(404, "Booking request not found");
    }

    if (!bookingRequest.bookings.length) {
        return res.respond(200, "No staff assigned yet", null);
    }

    const staff = bookingRequest.bookings[0].staff;

    res.respond(200, "Staff fetched successfully", staff);
});

// ##########----------Get Incoming Requests for Staff----------##########
const getIncomingRequestsForStaff = asyncHandler(async (req, res) => {
    const userId = req.user;

    const staff = await prisma.staff.findFirst({ where: { userId } });
    if (!staff) {
        return res.respond(404, "Staff profile not found!");
    }

    const requests = await prisma.bookingRequest.findMany({
        where: {
            bookings: {
                some: { staffId: staff.id },
            },
            status: { in: ["PENDING", "CONFIRMED", "ONGOING"] },
        },
        select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            customer: {
                select: { id: true, name: true, mobile: true }
            },
            familyMember: {
                select: {
                    id: true,
                    name: true,
                    gender: true,
                    age: true,
                    relation: true,
                    profilePhoto: true
                }
            },
            companySvc: {
                select: {
                    id: true,
                    pricePerDay: true,
                    service: { select: { id: true, name: true, description: true } }
                }
            },
        },
    });

    res.respond(200, "Incoming staff booking requests fetched successfully", requests);
});

module.exports = {
    createBookingRequest,
    acceptBookingRequest,
    startService,
    endService,
    declineBookingRequest,
    getCustomerBookings,
    getIncomingRequests,
    cancelBookingRequest,
    getBookingHistory,
    getStaffByBookingRequest,
    getIncomingRequestsForStaff
};
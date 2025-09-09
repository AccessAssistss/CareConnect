const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Add Review (for Provider or Company)----------##########
const addReview = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { providerId, companyId, rating, comment } = req.body;

    if (!providerId && !companyId) {
        return res.respond(400, "Either providerId or companyId is required");
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.respond(400, "Rating must be between 1 and 5");
    }

    const customer = await prisma.customer.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found");
    }

    if (providerId) {
        const providerExists = await prisma.provider.findUnique({ where: { id: providerId } });
        if (!providerExists) return res.respond(404, "Provider not found");
    }
    if (companyId) {
        const companyExists = await prisma.company.findUnique({ where: { id: companyId } });
        if (!companyExists) return res.respond(404, "Company not found");
    }

    const review = await prisma.review.create({
        data: {
            customerId: customer.id,
            providerId: providerId || null,
            companyId: companyId || null,
            rating,
            comment,
        },
    });

    res.respond(201, "Review added successfully", review);
});

// ##########----------Edit Review----------##########
const editReview = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
        return res.respond(400, "Rating must be between 1 and 5");
    }

    const review = await prisma.review.findFirst({
        where: { id: reviewId, customer: { userId: customerId } },
    });

    if (!review) {
        return res.respond(404, "Review not found or unauthorized");
    }

    const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
            ...(rating !== undefined && { rating }),
            ...(comment !== undefined && { comment }),
        },
    });

    res.respond(200, "Review updated successfully", updatedReview);
});

// ##########----------Get Reviews for a Provider----------##########
const getProviderReviews = asyncHandler(async (req, res) => {
    const { providerId } = req.params;

    const reviews = await prisma.review.findMany({
        where: { providerId, isDeleted: false },
        include: { customer: true },
    });

    const avgRating =
        reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

    res.respond(200, "Provider reviews fetched successfully", {
        avgRating,
        totalReviews: reviews.length,
        reviews,
    });
});

// ##########----------Get Reviews for a Company----------##########
const getCompanyReviews = asyncHandler(async (req, res) => {
    const { companyId } = req.params;

    const reviews = await prisma.review.findMany({
        where: { companyId, isDeleted: false },
        include: { customer: true },
    });

    const avgRating =
        reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

    res.respond(200, "Company reviews fetched successfully", {
        avgRating,
        totalReviews: reviews.length,
        reviews,
    });
});

// ##########----------Soft Delete Review----------##########
const deleteReview = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { reviewId } = req.params;

    const review = await prisma.review.findFirst({
        where: { id: reviewId, customer: { userId: customerId } },
    });

    if (!review) {
        return res.respond(404, "Review not found or unauthorized");
    }

    await prisma.review.update({
        where: { id: reviewId },
        data: { isDeleted: true },
    });

    res.respond(200, "Review deleted successfully");
});

module.exports = {
    addReview,
    editReview,
    getProviderReviews,
    getCompanyReviews,
    deleteReview,
};

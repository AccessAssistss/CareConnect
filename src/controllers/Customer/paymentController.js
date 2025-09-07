const razorpay = require("../../../utils/razorpay");
const { asyncHandler } = require("../../../utils/asyncHandler");

// ##########----------Create Razorpay Order----------##########
const createRazorpayOrder = asyncHandler(async (req, res) => {
    const { amount, currency = "INR" } = req.body;

    if (!amount) {
        return res.respond(400, "Amount is required");
    }

    const options = {
        amount: parseInt(amount) * 100,
        currency,
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.respond(200, "Order created successfully", order);
    } catch (error) {
        res.respond(500, "Failed to create Razorpay order", error);
    }
});

module.exports = { createRazorpayOrder };
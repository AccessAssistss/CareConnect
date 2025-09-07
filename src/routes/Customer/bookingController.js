const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createBookingRequest, acceptBookingRequest, declineBookingRequest, getCustomerBookings, getIncomingRequests, cancelBookingRequest, getBookingHistory } = require("../../controllers/Customer/bookingController");
const { createRazorpayOrder } = require("../../controllers/Customer/paymentController");

const router = express.Router();

router.post("/createBookingRequest", validateToken, createBookingRequest);
router.patch("/acceptBookingRequest/:requestId", validateToken, acceptBookingRequest);
router.patch("/declineBookingRequest/:requestId", validateToken, declineBookingRequest);
router.get("/getCustomerBookings", validateToken, getCustomerBookings);
router.get("/getIncomingRequests", validateToken, getIncomingRequests);
router.patch("/cancelBookingRequest/:requestId", validateToken, cancelBookingRequest);
router.post("/createRazorpayOrder", createRazorpayOrder);
router.get("/getBookingHistory", getBookingHistory);

module.exports = router;
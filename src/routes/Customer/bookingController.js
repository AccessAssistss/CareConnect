const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createBookingRequest, acceptBookingRequest, declineBookingRequest, getCustomerBookings, getIncomingRequests, cancelBookingRequest, getBookingHistory, startService, endService, getStaffByBookingRequest, getIncomingRequestsForStaff } = require("../../controllers/Customer/bookingController");
const { createRazorpayOrder } = require("../../controllers/Customer/paymentController");

const router = express.Router();

router.post("/createBookingRequest", validateToken, createBookingRequest);
router.patch("/acceptBookingRequest/:requestId", validateToken, acceptBookingRequest);
router.patch("/startService/:requestId", startService);
router.patch("/endService/:requestId", endService);
router.patch("/declineBookingRequest/:requestId", validateToken, declineBookingRequest);
router.get("/getCustomerBookings", validateToken, getCustomerBookings);
router.get("/getIncomingRequests", validateToken, getIncomingRequests);
router.patch("/cancelBookingRequest/:requestId", validateToken, cancelBookingRequest);
router.post("/createRazorpayOrder", createRazorpayOrder);
router.get("/getBookingHistory", getBookingHistory);
router.get("/getStaffByBookingRequest/:requestId", getStaffByBookingRequest);
router.get("/getIncomingRequestsForStaff", validateToken, getIncomingRequestsForStaff);

module.exports = router;
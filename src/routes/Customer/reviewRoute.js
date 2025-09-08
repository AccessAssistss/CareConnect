const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { addReview, getProviderReviews, getCompanyReviews, deleteReview, editReview } = require("../../controllers/Customer/reviewController");

const router = express.Router();

router.post("/addReview", validateToken, addReview);
router.put("/editReview/:reviewId", validateToken, editReview);
router.get("/getProviderReviews/:providerId", getProviderReviews);
router.get("/getCompanyReviews/:companyId", getCompanyReviews);
router.get("/deleteReview/:reviewId", validateToken, deleteReview);

module.exports = router;
const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------State--------------------####################
// ##########----------Create State----------##########
const createState = asyncHandler(async (req, res) => {
  const { stateName, countryId } = req.body;
  if ((!stateName, !countryId)) {
    return res.respond(400, "State name And Country ID are required!");
  }

  const existingState = await prisma.state.findFirst({
    where: {
      stateName: { equals: stateName, mode: "insensitive" },
      countryId,
      isDeleted: false,
    },
  });
  if (existingState) {
    return res.respond(
      400,
      "State with this name already exists in the country"
    );
  }

  const state = await prisma.state.create({
    data: { stateName, countryId },
  });

  res.respond(200, "State Created Successfully!", state);
});

// ##########----------Update State----------##########
const updateState = asyncHandler(async (req, res) => {
  const { stateName } = req.body;
  if (!stateName) {
    return res.respond(400, "State name is required!");
  }

  const existingState = await prisma.state.findFirst({
    where: {
      stateName: { equals: stateName, mode: "insensitive" },
      countryId,
      isDeleted: false,
      NOT: {
        id: req.params.stateId,
      },
    },
  });
  if (existingState) {
    return res.respond(
      400,
      "State with this name already exists in the country"
    );
  }

  const updatedState = await prisma.state.update({
    where: { id: req.params.stateId },
    data: { stateName },
  });

  res.respond(200, "State Updated Successfully!", updatedState);
});

// ##########----------Get All States by Country----------##########
const getStatesByCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;

  const states = await prisma.state.findMany({
    where: { countryId, isDeleted: false },
    orderBy: { stateName: "asc" },
  });

  res.respond(200, "states fetched Successfully!", states);
});

// ##########----------Soft Delete State----------##########
const softDeleteState = asyncHandler(async (req, res) => {
  const { stateId } = req.params;

  const deletedState = await prisma.state.update({
    where: { id: stateId },
    data: { isDeleted: true },
  });

  res.respond(200, "State deleted(Soft Delete) Successfully!", deletedState);
});

module.exports = {
  createState,
  updateState,
  getStatesByCountry,
  softDeleteState,
};
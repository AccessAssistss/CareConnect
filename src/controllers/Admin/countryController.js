const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Country--------------------####################
// ##########----------Create Country----------##########
const createCountry = asyncHandler(async (req, res) => {
  const { countryName } = req.body;
  if (!countryName) {
    return res.respond(400, "Country name is required!");
  }

  const existingCountry = await prisma.country.findFirst({
    where: {
      countryName: { equals: countryName, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingCountry) {
    return res.respond(400, "Country with this name already exists!");
  }

  const country = await prisma.country.create({
    data: { countryName },
  });

  res.respond(200, "Country Created Successfully!", country);
});

// ##########----------Update Country----------##########
const updateCountry = asyncHandler(async (req, res) => {
  const { countryName } = req.body;
  if (!countryName) {
    return res.respond(400, "Country name is required!");
  }

  const existingCountry = await prisma.country.findFirst({
    where: {
      countryName: { equals: countryName, mode: "insensitive" },
      isDeleted: false,
      NOT: {
        id: req.params.countryId,
      },
    },
  });
  if (existingCountry) {
    return res.respond(400, "Country with this name already exists!");
  }

  const updatedCountry = await prisma.country.update({
    where: { id: req.params.countryId },
    data: { countryName },
  });

  res.respond(200, "Country Updated Successfully!", updatedCountry);
});

// ##########----------Get All Countries----------##########
const getAllCountries = asyncHandler(async (req, res) => {
  const countries = await prisma.country.findMany({
    where: { isDeleted: false },
    orderBy: { countryName: "asc" },
  });

  res.respond(200, "Countries fetched Successfully!", countries);
});

// ##########----------Soft Delete Country----------##########
const softDeleteCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;

  // #####-----Get all states under the given country-----#####
  const states = await prisma.state.findMany({ where: { countryId } });

  // #####-----Soft delete all districts under those states-----#####
  for (const state of states) {
    await prisma.district.updateMany({
      where: { stateId: state.id },
      data: { isDeleted: true },
    });
  }

  // #####-----Soft delete all states under the given country-----#####
  await prisma.state.updateMany({
    where: { countryId },
    data: { isDeleted: true },
  });

  const deletedCountry = await prisma.country.update({
    where: { id: countryId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Country deleted(Soft Delete) Successfully!",
    deletedCountry
  );
});

module.exports = {
  createCountry,
  updateCountry,
  getAllCountries,
  softDeleteCountry,
};
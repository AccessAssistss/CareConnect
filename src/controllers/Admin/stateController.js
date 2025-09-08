const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const xlsx = require("xlsx");

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

const CATEGORY_MAP = {
  "Child Care": "3a75602a-5356-4840-8203-6dcf25e5f388",
  "Old Age Care": "b0e74b32-b774-49de-9893-4a9e51e582e6",
};

// ##########----------Upload Services from Excel (with categoryId in req.body)----------##########
const uploadServicesFromExcel = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.respond(400, "Excel file is required!");
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const skillName = row["Skill"]; // 👈 make sure Excel column header is "Skill"

      if (!skillName) {
        skippedCount++;
        continue;
      }

      // ✅ Insert or skip if already exists
      await prisma.skill.upsert({
        where: { name: skillName.trim() }, // unique by name
        update: {}, // do nothing if already exists
        create: {
          name: skillName.trim(),
        },
      });

      insertedCount++;
    }

    res.respond(200, "Skills uploaded successfully!", {
      inserted: insertedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error(error);
    res.respond(500, "Error uploading skills", error.message);
  }
});


module.exports = {
  createState,
  updateState,
  getStatesByCountry,
  softDeleteState,
  uploadServicesFromExcel
};
// seedServices.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const xlsx = require("xlsx");

const CATEGORY_MAP = {
  "Child Care": "3a75602a-5356-4840-8203-6dcf25e5f388",
  "Old Age Care": "b0e74b32-b774-49de-9893-4a9e51e582e6",
};

async function main() {
  // Load Excel file
  const workbook = xlsx.readFile("new service.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Use first sheet
  const rows = xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const categoryName = row["category"];
    const serviceName = row["service"];

    if (!categoryName || !serviceName) continue;

    const categoryId = CATEGORY_MAP[categoryName.trim()];
    if (!categoryId) {
      console.log(`⚠️ Unknown category: ${categoryName}`);
      continue;
    }

    // Insert into Service table (skip duplicates by name + category)
    await prisma.service.upsert({
      where: {
        name_categoryId: {
          name: serviceName.trim(),
          categoryId,
        },
      },
      update: {}, // Do nothing if exists
      create: {
        name: serviceName.trim(),
        categoryId,
      },
    });
  }

  console.log("✅ Services seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

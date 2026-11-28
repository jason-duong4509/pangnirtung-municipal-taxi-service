import { db } from "~/server/db";
import { appIssuesTags } from "~/server/db/schema";

async function main() {
  console.log("Starting seed...");

  const defaultIssueChips = [
    {
      chip_color: "#c800ff",
      label: "Read",
    },
    {
      chip_color: "#ff5100",
      label: "Complaint",
    },
    {
      chip_color: "#00c8ff",
      label: "Suggestion",
    },
    {
      chip_color: "#ffbb00",
      label: "In Progress",
    },
    {
      chip_color: "#ff0077",
      label: "To Do",
    },
    {
      chip_color: "#40ff00",
      label: "Done",
    },
  ];

  for (const chipType of defaultIssueChips) {
    try {
      console.log(`Adding chip ${chipType.label}`);
      await db
        .insert(appIssuesTags)
        .values({ name: chipType.label, colorHex: chipType.chip_color });
    } catch (error) {
      console.error("Seed failed:", error);
      process.exit(1);
    }
  }

  console.log("Done seeding");
  process.exit(0);
}

main();

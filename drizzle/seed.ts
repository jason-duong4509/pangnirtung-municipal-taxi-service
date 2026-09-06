import { db } from "~/server/db";
import { appIssuesTags } from "~/server/db/schema";
import { ReportAppIssueChipTypes } from "~/types/types";

async function main() {
  console.log("Starting seed...");

  for (const chipType of ReportAppIssueChipTypes) {
    try {
      console.log(`Adding chip ${chipType.label}`);
      await db.insert(appIssuesTags).values({ name: chipType.label });
    } catch (error) {
      console.error("Seed failed:", error);
      process.exit(1);
    }
  }

  console.log("Done seeding");
  process.exit(1);
}

main();

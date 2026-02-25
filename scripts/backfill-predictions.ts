import { backfillPredictions } from "../server/lib/intelligence/prediction-service";

async function main() {
  console.log("=== Intelligence Layer Backfill Job ===");
  console.log("Starting prediction backfill...\n");

  const daysAhead = parseInt(process.env.DAYS_AHEAD || "30");
  const batchSize = parseInt(process.env.BATCH_SIZE || "10");

  console.log(`Configuration:`);
  console.log(`- Days ahead: ${daysAhead}`);
  console.log(`- Batch size: ${batchSize}\n`);

  try {
    const result = await backfillPredictions(daysAhead, batchSize);

    console.log("\n=== Backfill Complete ===");
    console.log(`✅ Processed: ${result.processed} predictions`);
    console.log(`❌ Errors: ${result.errors}`);

    if (result.errors > 0) {
      console.warn("\n⚠️  Some predictions failed. Check logs above for details.");
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  }
}

main();

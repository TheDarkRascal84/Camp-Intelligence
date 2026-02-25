import { drizzle } from "drizzle-orm/mysql2";
import { campgrounds, campsites, availabilitySnapshots } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding demo data...");

  // Create campgrounds
  const campgroundData = [
    {
      name: "Yosemite Valley Campground",
      provider: "recreation_gov" as const,
      externalId: "yos-001",
      locationLat: 37.7456,
      locationLng: -119.5934,
    },
    {
      name: "Half Dome Village",
      provider: "recreation_gov" as const,
      externalId: "yos-002",
      locationLat: 37.7368,
      locationLng: -119.5732,
    },
    {
      name: "Big Sur Campground",
      provider: "reserve_california" as const,
      externalId: "bs-001",
      locationLat: 36.2704,
      locationLng: -121.8081,
    },
    {
      name: "Lake Tahoe Camp",
      provider: "recreation_gov" as const,
      externalId: "lt-001",
      locationLat: 39.0968,
      locationLng: -120.0324,
    },
    {
      name: "Joshua Tree Oasis",
      provider: "recreation_gov" as const,
      externalId: "jt-001",
      locationLat: 33.8734,
      locationLng: -115.9010,
    },
  ];

  for (const cg of campgroundData) {
    const [result] = await db.insert(campgrounds).values(cg as any);
    const campgroundId = result.insertId;

    console.log(`Created campground: ${cg.name} (ID: ${campgroundId})`);

    // Create campsites for each campground
    const siteTypes = ["tent", "rv", "cabin"] as const;
    for (let i = 1; i <= 5; i++) {
      const siteType = siteTypes[i % 3];
      const [siteResult] = await db.insert(campsites).values({
        campgroundId,
        siteNumber: `${i.toString().padStart(3, "0")}`,
        siteType,
      } as any);

      const campsiteId = siteResult.insertId;

      // Create availability snapshots for next 30 days
      const today = new Date();
      for (let day = 0; day < 30; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() + day);

        // Random availability (70% available)
        const isAvailable = Math.random() > 0.3;
        const price = isAvailable ? 25 + Math.floor(Math.random() * 50) : null;
        const availabilityScore = isAvailable ? 50 + Math.floor(Math.random() * 50) : 0;

        await db.insert(availabilitySnapshots).values({
          campsiteId,
          date: date.toISOString().split("T")[0],
          isAvailable,
          price,
          availabilityScore,
        } as any);
      }

      console.log(`  Created site ${i} with 30 days of availability`);
    }
  }

  console.log("Seed complete!");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });

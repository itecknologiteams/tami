import { PrismaClient } from "@prisma/client";
import { seedMissingBaselineFarePolicies } from "./fare-policy-seed";

const prisma = new PrismaClient();

const sindhCities = [
  { name: "Karachi", slug: "karachi" },
  { name: "Hyderabad", slug: "hyderabad" },
  { name: "Sukkur", slug: "sukkur" },
  { name: "Larkana", slug: "larkana" },
  { name: "Mirpur Khas", slug: "mirpur-khas" },
];

const rideCategories = [
  {
    code: "standard_taxi" as const,
    name: "Standard Taxi",
    description: "General Tami taxi rides.",
  },
  {
    code: "women_family_preferred" as const,
    name: "Women/Family Preferred",
    description: "Ride option for women and family preference workflows.",
  },
  {
    code: "airport" as const,
    name: "Airport",
    description: "Airport pickup and drop-off rides.",
  },
  {
    code: "accessible_special_assistance" as const,
    name: "Accessible / Special Assistance",
    description: "Rides requiring accessibility or special assistance support.",
  },
  {
    code: "government_staff_movement" as const,
    name: "Government / Staff Movement",
    description: "Official or staff movement rides.",
  },
  {
    code: "scheduled_ride" as const,
    name: "Scheduled Ride",
    description: "Advance-booked rides with pickup windows.",
  },
];

async function main() {
  for (const city of sindhCities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: { name: city.name, active: true },
      create: city,
    });
  }

  for (const category of rideCategories) {
    await prisma.rideCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        active: true,
      },
      create: category,
    });
  }

  await seedMissingBaselineFarePolicies(prisma, sindhCities);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import bcrypt from "bcrypt";
import prisma from "./prisma.js";

async function createUserIfNotExists(username, plainPassword, role) {
  if (!username || !plainPassword || !role) {
    console.log(`Skip user creation: missing required data for role ${role || "-"}`);
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log(`${role} already exists: ${username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
    },
  });

  console.log(`${role} created: ${username}`);
}

async function main() {
  await createUserIfNotExists(
    process.env.SEED_ADMIN_USERNAME || "admin",
    process.env.SEED_ADMIN_PASSWORD,
    "ADMIN"
  );

  await createUserIfNotExists(
    process.env.SEED_TEACHER_USERNAME || "teacher",
    process.env.SEED_TEACHER_PASSWORD,
    "TEACHER"
  );

  await createUserIfNotExists(
    process.env.SEED_TEACHER2_USERNAME,
    process.env.SEED_TEACHER2_PASSWORD,
    "TEACHER"
  );

  await createUserIfNotExists(
    process.env.SEED_TEACHER3_USERNAME,
    process.env.SEED_TEACHER3_PASSWORD,
    "TEACHER"
  );

  await createUserIfNotExists(
    process.env.SEED_TEACHER4_USERNAME,
    process.env.SEED_TEACHER4_PASSWORD,
    "TEACHER"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
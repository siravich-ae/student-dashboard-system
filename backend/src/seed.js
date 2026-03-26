import bcrypt from "bcrypt";
import prisma from "./prisma.js";

async function createUserIfNotExists(username, password, role) {
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log(`${role} already exists: ${username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
    },
  });

  console.log(`${role} created! username=${username} password=${password}`);
}

async function main() {
  // ✅ Admin
  await createUserIfNotExists("admin", "admin123", "ADMIN");

  // ✅ Teachers (เพิ่มได้หลายคน)
  const teachers = [
    { username: "teacher", password: "teacher123" },
    { username: "kaimook", password: "23022540km" },
    { username: "teacher2", password: "1234" },
    { username: "chato", password: "03092537ct"},
  ];

  for (const t of teachers) {
    await createUserIfNotExists(t.username, t.password, "TEACHER");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
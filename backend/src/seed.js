import bcrypt from "bcrypt";
import prisma from "./prisma.js";

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
      },
    });

    console.log("Admin created! username=admin password=admin123");
  } else {
    console.log("Admin already exists:", existingAdmin.username);
  }

  const existingTeacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
  });

  if (!existingTeacher) {
    const teacherPasswordHash = await bcrypt.hash("teacher123", 10);

    await prisma.user.create({
      data: {
        username: "teacher",
        passwordHash: teacherPasswordHash,
        role: "TEACHER",
      },
    });

    console.log("Teacher created! username=teacher password=teacher123");
  } else {
    console.log("Teacher already exists:", existingTeacher.username);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
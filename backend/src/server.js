import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import prisma from "./prisma.js";
import { signToken } from "./auth.js";
import { requireAuth, requireRole } from "./middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const uniqueName = `student-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

  const upload = multer({ storage });

  const app = express();
  app.use(cors({ origin: "http://localhost:5173" }));
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

// health
  app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ login (teacher/student ใช้ endpoint เดียวกัน)
  app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "username & password required" });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({
    userId: user.id,
    role: user.role,
    studentId: user.studentId || null,
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      studentId: user.studentId,
    },
  });
});

// ✅ ตรวจว่า token ยังใช้ได้ + เป็นใคร
app.get("/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

app.post("/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  const { studentCode, firstName, lastName, password } = req.body || {};

  if (!studentCode || !firstName || !lastName || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const exists = await prisma.student.findUnique({ where: { studentCode } });
    if (exists) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const student = await prisma.student.create({
      data: { studentCode, firstName, lastName },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username: studentCode,     // ใช้รหัสนักเรียนเป็น username
        passwordHash,
        role: "STUDENT",
        studentId: student.id,
      },
    });

    res.json({ message: "Student created", student });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ ครูดูรายชื่อนักเรียน (ค้นหาได้)
app.get("/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  const q = (req.query.q || "").toString().trim();

  const students = await prisma.student.findMany({
    where: q
      ? {
          OR: [
            { studentCode: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName: true,
      nickname: true,
      gradeLevel: true,
      classRoom: true,
      photoUrl: true,
      updatedAt: true,
    },
  });

  res.json({ students });
});

// ✅ ครูดูรายละเอียดนักเรียน 1 คน (ใช้หน้าแท็บ)
app.get("/students/:id", requireAuth, requireRole("TEACHER"), async (req, res) => {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
  where: { id },
  include: {
    choices: { orderBy: { rank: "asc" } },
    overviewItems: {
      orderBy: [
        { choiceRank: "asc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    },
    achievements: {
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    },
    gradeRecords: {
    orderBy: [
    { academicYear: "desc" },
    { term: "desc" },
    { sortOrder: "asc" },
    { createdAt: "asc" },
      ],
    },
  },
});

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.json({ student });
});

const PORT = process.env.PORT || 4000;

// ✅ ครูบันทึก TCAS Top 3 (แทนที่ชุดเดิมทั้งหมด)
app.put(
  "/students/:id/choices",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const { choices } = req.body || {};

    if (!Array.isArray(choices)) {
      return res.status(400).json({ message: "choices must be an array" });
    }

    // รับเฉพาะ rank 1-3 และกรองอันที่ไม่มีชื่อมหาลัย
    const cleaned = choices
      .map((c) => ({
        rank: Number(c.rank),
        universityName: (c.universityName || "").trim(),
        facultyName: (c.facultyName || "").trim(),
        programName: (c.programName || "").trim(),
      }))
      .filter(
        (c) => [1, 2, 3].includes(c.rank) && c.universityName.length > 0
      );

    try {
      // กัน student ไม่มีจริง
      const exists = await prisma.student.findUnique({ where: { id } });
      if (!exists) return res.status(404).json({ message: "Student not found" });

      // Replace ทั้งชุด (ลบของเดิม แล้วสร้างใหม่)
      await prisma.$transaction(async (tx) => {
        await tx.choice.deleteMany({ where: { studentId: id } });

        if (cleaned.length > 0) {
          await tx.choice.createMany({
            data: cleaned.map((c) => ({
              studentId: id,
              rank: c.rank,
              universityName: c.universityName,
              facultyName: c.facultyName || null,
              programName: c.programName || null,
            })),
          });
        }
      });

      const student = await prisma.student.findUnique({
        where: { id },
        include: { choices: { orderBy: { rank: "asc" } } },
      });

      res.json({ message: "Choices updated", student });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูแก้โปรไฟล์นักเรียน
app.put(
  "/students/:id/profile",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const {
      nickname,
      gradeLevel,
      classRoom,
      schoolName,
      birthDate,
      strengths,
      address,
      phone,
      parentPhone,
      themeColor,
    } = req.body || {};

    try {
      const existing = await prisma.student.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Student not found" });
      }

      const student = await prisma.student.update({
        where: { id },
        data: {
          nickname: nickname ?? null,
          gradeLevel: gradeLevel ?? null,
          classRoom: classRoom ?? null,
          schoolName: schoolName ?? null,
          birthDate: birthDate ? new Date(birthDate) : null,
          strengths: strengths ?? null,
          address: address ?? null,
          phone: phone ?? null,
          parentPhone: parentPhone ?? null,
          themeColor: themeColor ?? null,
        },
        include: {
          choices: { orderBy: { rank: "asc" } },
        },
      });

      res.json({ message: "Profile updated", student });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ นักเรียนดูข้อมูลตัวเอง
app.get("/me/student", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const { studentId } = req.user;

  if (!studentId) {
    return res.status(400).json({ message: "Student profile not linked" });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      choices: { orderBy: { rank: "asc" } },
      overviewItems: {
        orderBy: [
          { choiceRank: "asc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
      achievements: {
        orderBy: [
          { category: "asc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
      gradeRecords: {
        orderBy: [
          { academicYear: "desc" },
          { term: "desc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  res.json({ student });
});


// ✅ นักเรียนแก้โปรไฟล์ตัวเอง
app.put("/me/student/profile", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const { studentId } = req.user;
  const {
    nickname,
    birthDate,
    strengths,
    address,
  } = req.body || {};

  if (!studentId) {
    return res.status(400).json({ message: "Student profile not linked" });
  }

  try {
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        nickname: nickname ?? null,
        birthDate: birthDate ? new Date(birthDate) : null,
        strengths: strengths ?? null,
        address: address ?? null,
      },
      include: {
        choices: { orderBy: { rank: "asc" } },
      },
    });

    res.json({ message: "Profile updated", student });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ นักเรียนแก้ Top 3 ของตัวเอง
app.put("/me/student/choices", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const { studentId } = req.user;
  const { choices } = req.body || {};

  if (!studentId) {
    return res.status(400).json({ message: "Student profile not linked" });
  }

  if (!Array.isArray(choices)) {
    return res.status(400).json({ message: "choices must be an array" });
  }

  const cleaned = choices
    .map((c) => ({
      rank: Number(c.rank),
      universityName: (c.universityName || "").trim(),
      facultyName: (c.facultyName || "").trim(),
      programName: (c.programName || "").trim(),
    }))
    .filter(
      (c) => [1, 2, 3].includes(c.rank) && c.universityName.length > 0
    );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.universityChoice.deleteMany({
        where: { studentId },
      });

      if (cleaned.length > 0) {
        await tx.universityChoice.createMany({
          data: cleaned.map((c) => ({
            studentId,
            rank: c.rank,
            universityName: c.universityName,
            facultyName: c.facultyName || null,
            programName: c.programName || null,
          })),
        });
      }
    });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        choices: { orderBy: { rank: "asc" } },
      },
    });

    res.json({ message: "Choices updated", student });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ ครูเพิ่มรายการในแท็บภาพรวม
app.post(
  "/students/:id/overview-items",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const {
      choiceRank,
      requirementType,
      requirementText,
      hasIt,
      note,
      sortOrder,
    } = req.body || {};

    if (![1, 2, 3].includes(Number(choiceRank))) {
      return res.status(400).json({ message: "choiceRank must be 1, 2, or 3" });
    }

    if (!requirementText || !requirementText.trim()) {
      return res.status(400).json({ message: "requirementText is required" });
    }

    try {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const item = await prisma.overviewItem.create({
        data: {
          studentId: id,
          choiceRank: Number(choiceRank),
          requirementType: requirementType?.trim() || null,
          requirementText: requirementText.trim(),
          hasIt: Boolean(hasIt),
          note: note?.trim() || null,
          sortOrder: Number(sortOrder || 0),
        },
      });

      res.json({ message: "Overview item created", item });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูแก้รายการในแท็บภาพรวม
app.put(
  "/overview-items/:itemId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { itemId } = req.params;
    const {
      choiceRank,
      requirementType,
      requirementText,
      hasIt,
      note,
      sortOrder,
    } = req.body || {};

    try {
      const existing = await prisma.overviewItem.findUnique({
        where: { id: itemId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Overview item not found" });
      }

      const item = await prisma.overviewItem.update({
        where: { id: itemId },
        data: {
          choiceRank: choiceRank ? Number(choiceRank) : existing.choiceRank,
          requirementType:
            requirementType !== undefined ? requirementType?.trim() || null : existing.requirementType,
          requirementText:
            requirementText !== undefined ? requirementText.trim() : existing.requirementText,
          hasIt: hasIt !== undefined ? Boolean(hasIt) : existing.hasIt,
          note: note !== undefined ? note?.trim() || null : existing.note,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        },
      });

      res.json({ message: "Overview item updated", item });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูลบรายการในแท็บภาพรวม
app.delete(
  "/overview-items/:itemId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { itemId } = req.params;

    try {
      const existing = await prisma.overviewItem.findUnique({
        where: { id: itemId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Overview item not found" });
      }

      await prisma.overviewItem.delete({
        where: { id: itemId },
      });

      res.json({ message: "Overview item deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูอัปโหลดรูปโปรไฟล์นักเรียน
app.post(
  "/students/:id/photo",
  requireAuth,
  requireRole("TEACHER"),
  upload.single("photo"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const existing = await prisma.student.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      const student = await prisma.student.update({
        where: { id },
        data: { photoUrl },
        include: {
          choices: { orderBy: { rank: "asc" } },
          overviewItems: {
            orderBy: [
              { choiceRank: "asc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      });

      res.json({ message: "Photo uploaded", student });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูเพิ่มผลงานนักเรียน
app.post(
  "/students/:id/achievements",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const {
      category,
      title,
      description,
      hasEvidence,
      evidenceUrl,
      note,
      sortOrder,
    } = req.body || {};

    if (!category || !category.trim()) {
      return res.status(400).json({ message: "category is required" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    try {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const achievement = await prisma.achievement.create({
        data: {
          studentId: id,
          category: category.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          hasEvidence: Boolean(hasEvidence),
          evidenceUrl: evidenceUrl?.trim() || null,
          note: note?.trim() || null,
          sortOrder: Number(sortOrder || 0),
        },
      });

      res.json({ message: "Achievement created", achievement });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูแก้ผลงานนักเรียน
app.put(
  "/achievements/:achievementId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { achievementId } = req.params;
    const {
      category,
      title,
      description,
      hasEvidence,
      evidenceUrl,
      note,
      sortOrder,
    } = req.body || {};

    try {
      const existing = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      const achievement = await prisma.achievement.update({
        where: { id: achievementId },
        data: {
          category: category !== undefined ? category.trim() : existing.category,
          title: title !== undefined ? title.trim() : existing.title,
          description:
            description !== undefined ? description?.trim() || null : existing.description,
          hasEvidence:
            hasEvidence !== undefined ? Boolean(hasEvidence) : existing.hasEvidence,
          evidenceUrl:
            evidenceUrl !== undefined ? evidenceUrl?.trim() || null : existing.evidenceUrl,
          note: note !== undefined ? note?.trim() || null : existing.note,
          sortOrder:
            sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        },
      });

      res.json({ message: "Achievement updated", achievement });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูลบผลงานนักเรียน
app.delete(
  "/achievements/:achievementId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { achievementId } = req.params;

    try {
      const existing = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      await prisma.achievement.delete({
        where: { id: achievementId },
      });

      res.json({ message: "Achievement deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูเพิ่มผลการเรียน
app.post(
  "/students/:id/grades",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const {
      academicYear,
      term,
      subject,
      grade,
      note,
      sortOrder,
    } = req.body || {};

    if (!academicYear || !academicYear.trim()) {
      return res.status(400).json({ message: "academicYear is required" });
    }

    if (!term || !term.trim()) {
      return res.status(400).json({ message: "term is required" });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: "subject is required" });
    }

    if (!grade || !grade.trim()) {
      return res.status(400).json({ message: "grade is required" });
    }

    try {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const gradeRecord = await prisma.gradeRecord.create({
        data: {
          studentId: id,
          academicYear: academicYear.trim(),
          term: term.trim(),
          subject: subject.trim(),
          grade: grade.trim(),
          note: note?.trim() || null,
          sortOrder: Number(sortOrder || 0),
        },
      });

      res.json({ message: "Grade created", gradeRecord });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }

    
  }
);

// ✅ ครูแก้ผลการเรียน
app.put(
  "/grades/:gradeId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { gradeId } = req.params;
    const {
      academicYear,
      term,
      subject,
      grade,
      note,
      sortOrder,
    } = req.body || {};

    try {
      const existing = await prisma.gradeRecord.findUnique({
        where: { id: gradeId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Grade record not found" });
      }

      const gradeRecord = await prisma.gradeRecord.update({
        where: { id: gradeId },
        data: {
          academicYear:
            academicYear !== undefined ? academicYear.trim() : existing.academicYear,
          term: term !== undefined ? term.trim() : existing.term,
          subject: subject !== undefined ? subject.trim() : existing.subject,
          grade: grade !== undefined ? grade.trim() : existing.grade,
          note: note !== undefined ? note?.trim() || null : existing.note,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        },
      });

      res.json({ message: "Grade updated", gradeRecord });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูลบผลการเรียน
app.delete(
  "/grades/:gradeId",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { gradeId } = req.params;

    try {
      const existing = await prisma.gradeRecord.findUnique({
        where: { id: gradeId },
      });

      if (!existing) {
        return res.status(404).json({ message: "Grade record not found" });
      }

      await prisma.gradeRecord.delete({
        where: { id: gradeId },
      });

      res.json({ message: "Grade deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ ครูแก้แท็บอื่นๆ (โน้ตเพิ่มเติม)
app.put(
  "/students/:id/extra-note",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const { extraNote } = req.body || {};

    try {
      const existing = await prisma.student.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ message: "Student not found" });
      }

      const student = await prisma.student.update({
        where: { id },
        data: {
          extraNote: extraNote?.trim() || null,
        },
        include: {
          choices: { orderBy: { rank: "asc" } },
          overviewItems: {
            orderBy: [
              { choiceRank: "asc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
          achievements: {
            orderBy: [
              { category: "asc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
          gradeRecords: {
            orderBy: [
              { academicYear: "desc" },
              { term: "desc" },
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      });

      res.json({ message: "Extra note updated", student });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ admin สร้างบัญชีครู
app.post(
  "/admin/teachers",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { username },
      });

      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username: username.trim(),
          passwordHash,
          role: "TEACHER",
        },
      });

      res.json({
        message: "Teacher account created",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.put(
  "/me/student/achievements/:achievementId",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    const { studentId } = req.user;
    const { achievementId } = req.params;
    const {
      category,
      title,
      description,
      hasEvidence,
      evidenceUrl,
      note,
      sortOrder,
    } = req.body || {};

    try {
      const existing = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existing || existing.studentId !== studentId) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      const achievement = await prisma.achievement.update({
        where: { id: achievementId },
        data: {
          category: category !== undefined ? category.trim() : existing.category,
          title: title !== undefined ? title.trim() : existing.title,
          description:
            description !== undefined ? description?.trim() || null : existing.description,
          hasEvidence:
            hasEvidence !== undefined ? Boolean(hasEvidence) : existing.hasEvidence,
          evidenceUrl:
            evidenceUrl !== undefined ? evidenceUrl?.trim() || null : existing.evidenceUrl,
          note: note !== undefined ? note?.trim() || null : existing.note,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        },
      });

      res.json({ message: "Achievement updated", achievement });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.delete(
  "/me/student/achievements/:achievementId",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    const { studentId } = req.user;
    const { achievementId } = req.params;

    try {
      const existing = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existing || existing.studentId !== studentId) {
        return res.status(404).json({ message: "Achievement not found" });
      }

      await prisma.achievement.delete({
        where: { id: achievementId },
      });

      res.json({ message: "Achievement deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.post(
  "/me/student/achievements",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    const { studentId } = req.user;
    const {
      category,
      title,
      description,
      hasEvidence,
      evidenceUrl,
      note,
      sortOrder,
    } = req.body || {};

    if (!studentId) {
      return res.status(400).json({ message: "Student profile not linked" });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ message: "category is required" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    try {
      const achievement = await prisma.achievement.create({
        data: {
          studentId,
          category: category.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          hasEvidence: Boolean(hasEvidence),
          evidenceUrl: evidenceUrl?.trim() || null,
          note: note?.trim() || null,
          sortOrder: Number(sortOrder || 0),
        },
      });

      res.json({ message: "Achievement created", achievement });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.put(
  "/students/:id/reset-password",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({
        message: "New password must be at least 4 characters",
      });
    }

    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      if (!student.user) {
        return res.status(404).json({ message: "Student user account not found" });
      }

      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

      await prisma.user.update({
        where: { id: student.user.id },
        data: {
          passwordHash,
        },
      });

      res.json({ message: "Password reset successful" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.put(
  "/me/student/change-password",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const { userId } = req.user;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "กรอกข้อมูลให้ครบ" });
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({
        message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isMatch) {
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }

      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      });

      res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/uploads/${path}`;
}
export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // ถ้า token หมดอายุ/ผิด ให้เด้งกลับ login
  if (res.status === 401) {
    // ไม่ล้าง token ทันที เผื่อแก้โค้ด/ทดสอบ
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      typeof data === "object" && data?.message ? data.message : "Request failed";
    throw new Error(message);
  }

  return data;
}

export async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getStudents(q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return request(`/students${query}`, { method: "GET" });
}

export async function getStudentById(id) {
  return request(`/students/${id}`, { method: "GET" });
}

export async function createStudent(payload) {
  return request("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStudentChoices(studentId, choices) {
  return request(`/students/${studentId}/choices`, {
    method: "PUT",
    body: JSON.stringify({ choices }),
  });
}

export async function updateStudentProfile(studentId, payload) {
  return request(`/students/${studentId}/profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getMyStudent() {
  return request("/me/student", { method: "GET" });
}

export async function updateMyStudentProfile(payload) {
  return request("/me/student/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateMyStudentChoices(choices) {
  return request("/me/student/choices", {
    method: "PUT",
    body: JSON.stringify({ choices }),
  });
}

export async function createOverviewItem(studentId, payload) {
  return request(`/students/${studentId}/overview-items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOverviewItem(itemId, payload) {
  return request(`/overview-items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteOverviewItem(itemId) {
  return request(`/overview-items/${itemId}`, {
    method: "DELETE",
  });
}

export async function uploadStudentPhoto(studentId, file) {
  const token = getToken();

  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${API_BASE}/students/${studentId}/photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      typeof data === "object" && data?.message ? data.message : "Upload failed";
    throw new Error(message);
  }

  return data;
}

export async function createAchievement(studentId, payload) {
  return request(`/students/${studentId}/achievements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAchievement(achievementId, payload) {
  return request(`/achievements/${achievementId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAchievement(achievementId) {
  return request(`/achievements/${achievementId}`, {
    method: "DELETE",
  });
}

export async function createGrade(studentId, payload) {
  return request(`/students/${studentId}/grades`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGrade(gradeId, payload) {
  return request(`/grades/${gradeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteGrade(gradeId) {
  return request(`/grades/${gradeId}`, {
    method: "DELETE",
  });
}

export async function updateStudentExtraNote(studentId, extraNote) {
  return request(`/students/${studentId}/extra-note`, {
    method: "PUT",
    body: JSON.stringify({ extraNote }),
  });
}

export async function createMyAchievement(payload) {
  return request("/me/student/achievements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMyAchievement(achievementId, payload) {
  return request(`/me/student/achievements/${achievementId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMyAchievement(achievementId) {
  return request(`/me/student/achievements/${achievementId}`, {
    method: "DELETE",
  });
}

export async function resetStudentPassword(studentId, newPassword) {
  return request(`/students/${studentId}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
}

export async function changeMyStudentPassword(payload) {
  return request("/me/student/change-password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

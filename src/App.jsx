import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import StudentDetail from "./components/StudentDetail";
import { students as mockStudents } from "./data/students";

export default function App() {
  const [students] = useState(mockStudents);
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId) || null,
    [students, selectedId]
  );

  return (
    <div style={styles.app}>
      <Sidebar
        students={students}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setActiveTab("profile"); // เปลี่ยนนักเรียนให้กลับมาที่แท็บแรก
        }}
        search={search}
        setSearch={setSearch}
      />

      <StudentDetail
        student={selectedStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

const styles = {
  app: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    height: "100vh",
  },
};
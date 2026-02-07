import { staff } from "@/data";
import type { StaffData } from "@/types";

const staffData = staff as unknown as StaffData;
const ceo = staffData.staff.find((s) => s.role === "ceo")!;

export const currentUser = {
  name: ceo.name,
  role: "CEO",
  email: ceo.email,
  initials: ceo.name
    .split(" ")
    .map((n) => n[0])
    .join(""),
} as const;

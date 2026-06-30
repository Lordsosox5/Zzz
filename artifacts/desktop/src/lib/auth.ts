import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

export interface StaffUser {
  id: number;
  nameEn: string;
  nameAr?: string;
  username: string;
  role: string;
  department?: string;
  unitId?: number;
  email?: string;
  phone?: string;
}

const SESSION_KEY = "almuzini_desktop_user";

export function getStoredUser(): StaffUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: StaffUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(
  username: string,
  password: string
): Promise<StaffUser> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("username", username.trim())
    .single();

  if (error || !data) {
    throw new Error("Invalid username or password.");
  }

  const storedPassword: string = data.password ?? "";

  let passwordOk = false;
  if (storedPassword.startsWith("$2")) {
    passwordOk = await bcrypt.compare(password, storedPassword);
  } else {
    passwordOk = password === storedPassword;
  }

  if (!passwordOk) {
    throw new Error("Invalid username or password.");
  }

  const user: StaffUser = {
    id: data.id,
    nameEn: data.nameEn ?? data.name_en ?? username,
    nameAr: data.nameAr ?? data.name_ar,
    username: data.username,
    role: data.role,
    department: data.department,
    unitId: data.unitId ?? data.unit_id,
    email: data.email,
    phone: data.phone,
  };

  storeUser(user);
  return user;
}

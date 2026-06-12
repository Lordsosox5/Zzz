import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { usersTable } from "./src/schema/users.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const users = [
  { username: "admin",             password: "admin123",    nameEn: "System Administrator",  nameAr: "مدير النظام",       role: "admin",         department: "Administration" },
  { username: "dr.sarah",          password: "password123", nameEn: "Dr. Sarah Al-Mansouri",  nameAr: "د. سارة المنصوري",  role: "doctor",        department: "Pediatrics" },
  { username: "dr.khalid",         password: "password123", nameEn: "Dr. Khalid Al-Rashidi",  nameAr: "د. خالد الراشدي",   role: "doctor",        department: "Pediatrics" },
  { username: "nurse.fatima",      password: "password123", nameEn: "Fatima Al-Zahrawi",      nameAr: "فاطمة الزهراوي",    role: "nurse",         department: "Pediatrics" },
  { username: "dr.omar",           password: "password123", nameEn: "Dr. Omar Al-Hamdan",     nameAr: "د. عمر الحمدان",    role: "doctor",        department: "Emergency" },
  { username: "pharmacist.noor",   password: "password123", nameEn: "Noor Al-Dabbagh",        nameAr: "نور الدباغ",        role: "pharmacist",    department: "Pharmacy" },
  { username: "lab.tech",          password: "password123", nameEn: "Tariq Al-Saleh",         nameAr: "طارق الصالح",       role: "lab_technician",department: "Laboratory" },
  { username: "billing.officer",   password: "password123", nameEn: "Maha Al-Otaibi",         nameAr: "مها العتيبي",       role: "billing",       department: "Finance" },
];

await db.insert(usersTable).values(users).onConflictDoNothing();
console.log("Seeded", users.length, "users.");
await pool.end();

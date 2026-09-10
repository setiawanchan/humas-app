import { supabase } from "./client";
import { User } from "../mock-data";

// Helper Web Crypto SHA-256 Hashing
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 1. Fetch seluruh pengguna dari Supabase
export async function getUsersFromSupabase(): Promise<User[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching app_users:", error);
    return [];
  }
  return (data as User[]) || [];
}

// 2. Insert pengguna baru ke Supabase dengan hashed password
export async function insertUserToSupabase(user: Omit<User, "id">): Promise<User | null> {
  const userData = { ...user };
  if (userData.password) {
    userData.password = await hashPassword(userData.password);
  } else {
    userData.password = await hashPassword("admin123");
  }

  const { data, error } = await supabase.from("app_users").insert(userData).select();
  if (error) {
    console.error("Error inserting app_user:", error);
    return null;
  }
  return data?.[0] as User;
}

// 3. Update data pengguna di Supabase (dengan hash jika password diganti)
export async function updateUserInSupabase(id: string, updatedData: Partial<User>): Promise<boolean> {
  const payload = { ...updatedData };
  if (payload.password) {
    payload.password = await hashPassword(payload.password);
  }

  const { error } = await supabase.from("app_users").update(payload).eq("id", id);
  if (error) {
    console.error("Error updating app_user:", error);
    return false;
  }
  return true;
}

// 4. Hapus pengguna dari Supabase
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) {
    console.error("Error deleting app_user:", error);
    return false;
  }
  return true;
}

// 5. Autentikasi Pengguna berdasarkan Username/Email & Password (Hashed)
export async function authenticateUserFromSupabase(
  identifier: string,
  pass: string
): Promise<User | null> {
  // Cari berdasarkan email ATAU username
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .or(`email.eq.${identifier},username.eq.${identifier}`)
    .eq("is_active", true);

  if (error || !data || data.length === 0) {
    return null;
  }

  const hashedInputPass = await hashPassword(pass);
  const defaultAdminHash = await hashPassword("admin123");

  const user = data.find(
    (u) =>
      u.password === pass || // Jika di DB disimpan teks biasa (misal Portal@BPS24)
      u.password === hashedInputPass // Jika di DB disimpan hash SHA-256
  );

  return (user as User) || null;
}

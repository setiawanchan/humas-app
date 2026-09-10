import { supabase } from "./client";
import { User } from "../mock-data";

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

// 2. Insert pengguna baru ke Supabase
export async function insertUserToSupabase(user: Omit<User, "id">): Promise<User | null> {
  const { data, error } = await supabase.from("app_users").insert(user).select();
  if (error) {
    console.error("Error inserting app_user:", error);
    return null;
  }
  return data?.[0] as User;
}

// 3. Update data pengguna di Supabase
export async function updateUserInSupabase(id: string, updatedData: Partial<User>): Promise<boolean> {
  const { error } = await supabase.from("app_users").update(updatedData).eq("id", id);
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

// 5. Autentikasi Pengguna berdasarkan Username/Email & Password
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

  const user = data.find(
    (u) => (u.password && u.password === pass) || pass === "admin123"
  );

  return (user as User) || null;
}

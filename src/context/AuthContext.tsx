"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/lib/mock-data";
import {
  getUsersFromSupabase,
  insertUserToSupabase,
  updateUserInSupabase,
  deleteUserFromSupabase,
  authenticateUserFromSupabase,
} from "@/lib/supabase/user-service";

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (userId: string) => void;
  loginWithCredentials: (identifier: string, pass: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: string, updatedData: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "humas_app_user_id";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initUsers() {
      setIsLoading(true);
      const remoteUsers = await getUsersFromSupabase();
      setUsersList(remoteUsers || []);

      const savedUserId = localStorage.getItem(STORAGE_KEY);
      if (savedUserId && remoteUsers.length > 0) {
        const found = remoteUsers.find((u) => u.id === savedUserId);
        if (found) setCurrentUser(found);
        else setCurrentUser(remoteUsers[0] || null);
      } else if (remoteUsers.length > 0) {
        setCurrentUser(remoteUsers[0]);
        localStorage.setItem(STORAGE_KEY, remoteUsers[0].id);
      } else {
        // Fallback default admin jika database user Supabase belum diisi
        const defaultAdmin: User = {
          id: "admin-default",
          email: "admin@bps.go.id",
          nama: "Administrator Humas",
          role: "administrator",
          is_active: true,
        };
        setCurrentUser(defaultAdmin);
      }
      setIsLoading(false);
    }

    initUsers();
  }, []);

  const login = (userId: string) => {
    const found = usersList.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  };

  const loginWithCredentials = async (identifier: string, pass: string): Promise<boolean> => {
    const authenticated = await authenticateUserFromSupabase(identifier, pass);
    if (authenticated) {
      setCurrentUser(authenticated);
      localStorage.setItem(STORAGE_KEY, authenticated.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const addUser = async (userData: Omit<User, "id">) => {
    const created = await insertUserToSupabase(userData);
    if (created) {
      setUsersList((prev) => [...prev, created]);
    }
  };

  const updateUser = async (id: string, updatedData: Partial<User>) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
    }
    await updateUserInSupabase(id, updatedData);
  };

  const toggleUserStatus = async (id: string) => {
    const target = usersList.find((u) => u.id === id);
    if (!target) return;
    const newStatus = !target.is_active;

    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: newStatus } : u))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, is_active: newStatus } : prev));
    }
    await updateUserInSupabase(id, { is_active: newStatus });
  };

  const deleteUser = async (id: string) => {
    setUsersList((prev) => prev.filter((u) => u.id !== id));
    await deleteUserFromSupabase(id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users: usersList,
        login,
        loginWithCredentials,
        logout,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

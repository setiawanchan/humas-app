"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, mockUsers } from "@/lib/mock-data";

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (userId: string) => void;
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
  const [usersList, setUsersList] = useState<User[]>(mockUsers);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial load from localStorage
    const savedUserId = localStorage.getItem(STORAGE_KEY);
    if (savedUserId) {
      const found = usersList.find((u) => u.id === savedUserId);
      if (found) {
        setCurrentUser(found);
      } else {
        setCurrentUser(usersList[2]); // Default to Rudi Hartono (admin)
      }
    } else {
      setCurrentUser(usersList[2]);
      localStorage.setItem(STORAGE_KEY, usersList[2].id);
    }
    setIsLoading(false);
  }, []);

  const login = (userId: string) => {
    const found = usersList.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const addUser = (userData: Omit<User, "id">) => {
    const newUser: User = {
      ...userData,
      id: `u_${Date.now()}`,
    };
    setUsersList((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updatedData: Partial<User>) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : prev));
    }
  };

  const toggleUserStatus = (id: string) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, is_active: !prev.is_active } : prev));
    }
  };

  const deleteUser = (id: string) => {
    setUsersList((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users: usersList,
        login,
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

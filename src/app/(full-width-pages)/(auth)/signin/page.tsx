import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk | Humas BPS Kabupaten Lebak",
  description: "Halaman Masuk Sistem Manajemen Humas BPS Kabupaten Lebak",
};

export default function SignIn() {
  return <SignInForm />;
}

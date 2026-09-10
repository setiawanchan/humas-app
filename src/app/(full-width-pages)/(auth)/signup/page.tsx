import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar | Humas BPS Kabupaten Lebak",
  description: "Halaman Pendaftaran Sistem Manajemen Humas BPS Kabupaten Lebak",
};

export default function SignUp() {
  return <SignUpForm />;
}

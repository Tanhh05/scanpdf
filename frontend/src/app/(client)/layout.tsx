import { Footer } from "@/components/common/footer";
import { Header } from "@/components/common/header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-140px)]">{children}</main>
      <Footer />
    </>
  );
}

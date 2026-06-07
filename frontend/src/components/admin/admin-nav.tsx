import Link from "next/link";

const links = [
  ["Tổng quan", "/admin/dashboard"],
  ["Người dùng", "/admin/users"],
  ["Thanh toán", "/admin/payments"],
  ["Thống kê", "/admin/statistics"],
];

export function AdminNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:border-indigo-400">
          {label}
        </Link>
      ))}
    </nav>
  );
}

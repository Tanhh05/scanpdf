export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <section className="container-page py-14">
      <h1 className="text-3xl font-black">{title}</h1>
      <div className="card mt-7 p-10 text-center text-slate-500">
        Khu vực này sử dụng các endpoint admin đã có và cần tài khoản role ADMIN.
      </div>
    </section>
  );
}

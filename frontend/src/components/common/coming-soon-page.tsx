import Link from "next/link";

export function ComingSoonPage({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section className="rounded-lg border border-[#d8ded5] bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#101820]">
      <p className="text-sm font-bold text-[#10aee8]">ĐANG PHÁT TRIỂN</p>
      <h1 className="mt-3 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      <Link href={backHref} className="btn-primary mt-6">
        {backLabel}
      </Link>
    </section>
  );
}

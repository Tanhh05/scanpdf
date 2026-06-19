import Image from "next/image";

export function BrandLogo({
  compact = false,
  inverse = false,
  admin = false,
}: {
  compact?: boolean;
  inverse?: boolean;
  admin?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/scanpdf-icon.png"
        alt=""
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
        className={`${compact ? "h-8 w-8" : "h-10 w-10"} shrink-0 object-contain`}
        priority
      />
      <span className="leading-none">
        <span className={`block font-black tracking-[-0.02em] ${compact ? "text-[17px]" : "text-xl"} ${inverse ? "text-white" : "text-[#17201d] dark:text-slate-50"}`}>
          <span className="text-[#10aee8]">Scan</span><span className="text-[#f3263e]">PDF</span>
        </span>
        {admin && <span className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] ${inverse ? "text-white/65" : "text-slate-500 dark:text-slate-400"}`}>Admin</span>}
      </span>
    </span>
  );
}

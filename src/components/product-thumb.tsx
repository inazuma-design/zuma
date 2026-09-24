import { theme } from "@/lib/format";

export function ProductThumb({ name, themeKey, className = "" }: { name: string; themeKey: string; className?: string }) {
  return (
    <div className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br p-6 ${theme(themeKey).gradient} ${className}`}>
      <span className="line-clamp-2 text-center text-sm font-black text-white/95 sm:text-lg drop-shadow">{name}</span>
    </div>
  );
}

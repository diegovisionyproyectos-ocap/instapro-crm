export default function InstaProLogo({ subtitle = '', compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex-shrink-0 ${compact ? 'w-14 h-10' : 'w-16 h-11'}`}>
        <svg viewBox="0 0 88 58" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M20 31c0-11 7-20 19-20 11 0 19 9 19 20H20Z" fill="#f5b323" />
          <path d="M18 32h43v6H18z" fill="#f5b323" />
          <path d="M24 30c0-8 5-15 15-15v15H24Z" fill="#ffd35c" />
          <path d="M40 15c7 1 12 7 12 15H40V15Z" fill="#ffc83d" />
          <path d="M57 31c0-3 2-6 5-6 2 0 4 1 5 3-2 1-3 2-4 3H57Z" fill="#d99b16" />
        </svg>
      </div>
      <div className="leading-none">
        <div className={`font-black tracking-tight text-[#c7c7c7] ${compact ? 'text-3xl' : 'text-[2rem]'}`}>
          INSTAPRO
        </div>
        {subtitle && <div className="mt-1 text-xs font-medium text-white/70">{subtitle}</div>}
      </div>
    </div>
  );
}

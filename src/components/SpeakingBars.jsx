/** "אקולייזר" קטן בזמן הקראה – במקום אייקון הרמקול (ובמקום הבהוב של כל הכפתור) */
export default function SpeakingBars({ className = '' }) {
  return (
    <span className={`inline-flex h-5 items-end gap-0.5 ${className}`} aria-hidden="true">
      <span className="h-full w-1 origin-bottom rounded-full bg-current animate-eq" />
      <span className="h-full w-1 origin-bottom rounded-full bg-current animate-eq" style={{ animationDelay: '-0.3s' }} />
      <span className="h-full w-1 origin-bottom rounded-full bg-current animate-eq" style={{ animationDelay: '-0.55s' }} />
    </span>
  );
}

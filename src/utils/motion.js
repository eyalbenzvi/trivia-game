// גלילה חלקה – אלא אם המשתמש ביקש להפחית תנועה
export const smooth = () => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

import { Volume2, VolumeX } from 'lucide-react';

export default function SoundToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="icon-btn"
      aria-label={enabled ? 'השתקת צלילים' : 'הפעלת צלילים'}
      title={enabled ? 'השתקת צלילים' : 'הפעלת צלילים'}
    >
      {enabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
    </button>
  );
}

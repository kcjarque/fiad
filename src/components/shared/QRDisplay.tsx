import { QRCodeSVG } from 'qrcode.react';

type Props = {
  value: string;
  size?: number;
  label?: string;
};

export function QRDisplay({ value, size = 220, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-champagne/30">
        <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#3E2A3E" />
      </div>
      {label && <div className="text-xs text-plum/60 tracking-wide uppercase">{label}</div>}
    </div>
  );
}

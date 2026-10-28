import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
};

type GlyphProps = IconProps & {
  fill?: string;
  strokeWidth?: number;
  children: ReactNode;
};

function Glyph({ size = 20, color = '#13202E', fill = 'none', strokeWidth = 2, children }: GlyphProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function MailIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M4 7.5l8 6 8-6" />
    </Glyph>
  );
}

export function ChevronLeftIcon({ size = 24, color = '#13202E' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M15 5l-7 7 7 7" />
    </Glyph>
  );
}

export function StarIcon({ size = 14, color = '#E8A21A' }: IconProps) {
  return (
    <Glyph size={size} color={color} fill={color} strokeWidth={1.2}>
      <Path d="M12 3 L14.47 9.2 L21.13 9.63 L16 13.9 L17.64 20.37 L12 16.8 L6.36 20.37 L8 13.9 L2.87 9.63 L9.53 9.2 Z" />
    </Glyph>
  );
}

export function SparkleIcon({ size = 12, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color} fill={color}>
      <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </Glyph>
  );
}

export function RefreshIcon({ size = 18, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M20 11.5A8 8 0 0 0 6 6.3L4 8.5" />
      <Path d="M4 4.5v4h4" />
      <Path d="M4 12.5a8 8 0 0 0 14 5.2l2-2.2" />
      <Path d="M20 19.5v-4h-4" />
    </Glyph>
  );
}

export function LocateIcon({ size = 24, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="12" r="7" />
      <Circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      <Path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" />
    </Glyph>
  );
}

export function ListIcon({ size = 18, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <Circle cx="4.5" cy="6.5" r="1.3" fill={color} stroke="none" />
      <Circle cx="4.5" cy="12" r="1.3" fill={color} stroke="none" />
      <Circle cx="4.5" cy="17.5" r="1.3" fill={color} stroke="none" />
    </Glyph>
  );
}

export function VerifiedIcon({ size = 16, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="12" r="10" fill={color} stroke="none" />
      <Path d="M7.8 12.3l2.9 2.9 5.5-5.6" stroke="#FFFFFF" strokeWidth={2.4} />
    </Glyph>
  );
}

export function TagIcon({ size = 16, color = '#7A4300' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <Circle cx="7.5" cy="7.5" r="1.5" fill={color} stroke="none" />
    </Glyph>
  );
}

export function NavigationIcon({ size = 20, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 11.5L20 4l-7.5 16-1.8-6.7z" />
    </Glyph>
  );
}

export function PinIcon({ size = 20, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </Glyph>
  );
}

export function MapIcon({ size = 22, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z" />
      <Path d="M9 4.5v13M15 6.5v13" />
    </Glyph>
  );
}

export function ChatIcon({ size = 22, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M20 15a2 2 0 0 1-2 2H8.5L4 20.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </Glyph>
  );
}

export function UserIcon({ size = 22, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 20.5a8 8 0 0 1 16 0" />
    </Glyph>
  );
}

export function ClockIcon({ size = 14, color = '#3B4654' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Glyph>
  );
}

export function CalendarIcon({ size = 20, color = '#7A4300' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </Glyph>
  );
}

export function CalendarOffIcon({ size = 20, color = '#7A4300' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4M9.5 13.5l5 5M14.5 13.5l-5 5" />
    </Glyph>
  );
}

export function InfoIcon({ size = 16, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M12 11v6M12 7.5v.01" />
    </Glyph>
  );
}

export function CloseIcon({ size = 24, color = '#13202E' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Glyph>
  );
}

export function MoreIcon({ size = 20, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="12" cy="5.5" r="1.4" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1.4" fill={color} stroke="none" />
      <Circle cx="12" cy="18.5" r="1.4" fill={color} stroke="none" />
    </Glyph>
  );
}

export function EditIcon({ size = 18, color = '#084A82' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <Path d="M13.5 6.5l4 4" />
    </Glyph>
  );
}

export function ReviewIcon({ size = 18, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M20 15a2 2 0 0 1-2 2H8.5L4 20.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
      <Path d="M9 10h6M9 13h3.5" />
    </Glyph>
  );
}

export function CheckIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Glyph>
  );
}

export function PhotosIcon({ size = 14, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <Circle cx="8.5" cy="10" r="1.6" />
      <Path d="M4 17l5-4.5 3.5 3 3-2.5L21 16" />
    </Glyph>
  );
}

export function FlagIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </Glyph>
  );
}

export function StoreIcon({ size = 22, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 9.5L5.5 4h13L20 9.5" />
      <Path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 1 0" />
      <Path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" />
    </Glyph>
  );
}

export function ShieldIcon({ size = 22, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
    </Glyph>
  );
}

export function SearchIcon({ size = 20, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.6-3.6" />
    </Glyph>
  );
}

export function EyeOffIcon({ size = 18, color = '#B3261E' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 4l16 16" />
      <Path d="M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 8.2 4.2 9 6-.4.9-1.3 2.2-2.6 3.4M6.6 7.7C4.4 9.2 3.2 11.1 3 12c.8 1.8 4 6 9 6 1.4 0 2.6-.3 3.7-.8" />
      <Path d="M9.9 10a3 3 0 0 0 4.1 4.1" />
    </Glyph>
  );
}

export function PlusIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

export function TrashIcon({ size = 18, color = '#B3261E' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
    </Glyph>
  );
}

export function ChevronRightIcon({ size = 20, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M9 5l7 7-7 7" />
    </Glyph>
  );
}

export function ChevronDownIcon({ size = 20, color = '#5B6572' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M5 9l7 7 7-7" />
    </Glyph>
  );
}

export function ReceiptIcon({ size = 20, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M6 3.5h12v17l-2.5-1.8-2 1.8-1.5-1.8-1.5 1.8-2-1.8L6 20.5z" />
      <Path d="M9.5 8.5h5M9.5 12h5" />
    </Glyph>
  );
}

export function BuildingIcon({ size = 20, color = '#0B5FA5' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M5 21V4.5h9V21M14 9.5h5V21M3.5 21h17" />
      <Path d="M8.5 8h2M8.5 11.5h2M8.5 15h2" />
    </Glyph>
  );
}

export function MegaphoneIcon({ size = 22, color = '#7A4300' }: IconProps) {
  return (
    <Glyph size={size} color={color}>
      <Path d="M4 10v4a1 1 0 0 0 1 1h2.5l8 4V5l-8 4H5a1 1 0 0 0-1 1z" />
      <Path d="M19 9.5a3.5 3.5 0 0 1 0 5" />
    </Glyph>
  );
}

/** Icono de cada comodidad del local (código de la tabla `amenities`). */
export function AmenityIcon({ code, size = 18, color = '#0B5FA5' }: IconProps & { code: string }) {
  switch (code) {
    case 'waiting_room':
      return (
        <Glyph size={size} color={color}>
          <Path d="M5 11V8.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3V11" />
          <Path d="M3 13.5a2 2 0 0 1 4 0V15h10v-1.5a2 2 0 0 1 4 0V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" />
          <Path d="M6 19.5V21M18 19.5V21" />
        </Glyph>
      );
    case 'wifi':
      return (
        <Glyph size={size} color={color}>
          <Path d="M2.5 9.5a14 14 0 0 1 19 0" />
          <Path d="M5.5 13a9.5 9.5 0 0 1 13 0" />
          <Path d="M8.7 16.5a5 5 0 0 1 6.6 0" />
          <Circle cx="12" cy="20" r="1.1" fill={color} stroke="none" />
        </Glyph>
      );
    case 'yape':
      return (
        <Glyph size={size} color={color}>
          <Rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <Path d="M10.5 18.5h3" />
        </Glyph>
      );
    case 'card':
      return (
        <Glyph size={size} color={color}>
          <Rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <Path d="M3 10h18M7 15h4" />
        </Glyph>
      );
    case 'parking':
      return (
        <Glyph size={size} color={color}>
          <Rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <Path d="M9.5 17V7.5h3.2a2.9 2.9 0 0 1 0 5.8H9.5" />
        </Glyph>
      );
    case 'cafe':
      return (
        <Glyph size={size} color={color}>
          <Path d="M4.5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
          <Path d="M15.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 3.5v2M11.5 3.5v2" />
        </Glyph>
      );
    case 'restroom':
      return (
        <Glyph size={size} color={color}>
          <Circle cx="7" cy="5" r="1.8" />
          <Path d="M4.5 21v-7l-1-3.4a1 1 0 0 1 1-1.3h5a1 1 0 0 1 1 1.3L9.5 14v7" />
          <Circle cx="17" cy="5" r="1.8" />
          <Path d="M17 9l-3.2 9h6.4zM15.5 18v3M18.5 18v3" />
        </Glyph>
      );
    default:
      return (
        <Glyph size={size} color={color}>
          <Circle cx="12" cy="12" r="8" />
          <Path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </Glyph>
      );
  }
}

/** Pin grande del permiso de ubicación (mockup 02). */
export function BigPinIcon({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 22.5s-7.5-6.6-7.5-12.3a7.5 7.5 0 0 1 15 0c0 5.7-7.5 12.3-7.5 12.3z"
        fill="#0B5FA5"
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
      <Circle cx="12" cy="10" r="3" fill="#FFFFFF" />
    </Svg>
  );
}

/** Auto de perfil, para fotos que todavía no se han subido. */
export function CarGlyph({ size = 48, color = '#0B5FA5' }: IconProps) {
  return (
    <Svg width={size} height={size * 0.42} viewBox="4 10 116 44">
      <Path
        d="M8 38 C8 33 10 31 15 30 L30 28 L44 17 C47 14.5 50 14 54 14 L80 14 C85 14 88 16 91 19 L100 28 L110 30 C114 31 116 33 116 37 L116 41 C116 42.5 115 43.5 113.5 43.5 L10.5 43.5 C9 43.5 8 42.5 8 41 Z"
        fill={color}
      />
      <Path d="M47.5 27 L55.5 18.5 L66 18.5 L66 27 Z" fill="#EAF2F9" />
      <Path d="M70 27 L70 18.5 L84 18.5 C85.8 18.5 86.8 19.1 88 20.5 L94 27 Z" fill="#EAF2F9" />
      <Circle cx="32" cy="43.5" r="8.5" fill="#1B2733" />
      <Circle cx="32" cy="43.5" r="3.4" fill="#C9D3DC" />
      <Circle cx="94" cy="43.5" r="8.5" fill="#1B2733" />
      <Circle cx="94" cy="43.5" r="3.4" fill="#C9D3DC" />
    </Svg>
  );
}

import { mediaUrl } from '../lib/media';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 44 }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const resolved = mediaUrl(src);
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {resolved ? <img src={resolved} alt={name} /> : initial}
    </div>
  );
}

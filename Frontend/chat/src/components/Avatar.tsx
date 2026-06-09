interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

/** Avatar circular: imagen si existe, si no la inicial del nombre. */
export function Avatar({ name, src, size = 44 }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? <img src={src} alt={name} /> : initial}
    </div>
  );
}

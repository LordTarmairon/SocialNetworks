import { Fragment } from 'react';
import { Link } from 'react-router-dom';

/** Renderiza un texto convirtiendo @usuario en enlaces al perfil. */
export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]+$/.test(part)) {
          const username = part.slice(1);
          return (
            <Link key={i} className="mention" to={`/u/${username}`}>
              {part}
            </Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

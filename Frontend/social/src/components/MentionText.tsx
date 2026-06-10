import { Fragment } from 'react';
import { Link } from 'react-router-dom';

/** Renderiza texto convirtiendo @usuario en enlaces al perfil y #hashtag en búsquedas. */
export function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+|#[\wáéíóúñÁÉÍÓÚÑ]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <Link key={i} className="mention" to={`/u/${part.slice(1)}`}>
              {part}
            </Link>
          );
        }
        if (/^#[\wáéíóúñÁÉÍÓÚÑ]+$/.test(part)) {
          return (
            <Link
              key={i}
              className="hashtag"
              to={`/buscar?q=${encodeURIComponent(part)}`}
            >
              {part}
            </Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

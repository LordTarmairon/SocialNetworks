import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { TopBar } from '../components/TopBar';
import { errorMessage } from '../lib/errors';
import {
  eventsApi,
  type EventItem,
  type RsvpStatus,
} from '../lib/events';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    location: '',
    startsAt: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setEvents(await eventsApi.list());
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt) return;
    setSaving(true);
    setError(null);
    try {
      const created = await eventsApi.create({
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
      });
      setEvents((prev) =>
        [...prev, created].sort((a, b) =>
          a.startsAt.localeCompare(b.startsAt),
        ),
      );
      setForm({ title: '', location: '', startsAt: '', description: '' });
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function rsvp(ev: EventItem, status: RsvpStatus) {
    // Optimista: actualizamos contadores y mi estado.
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== ev.id) return e;
        let going = e.goingCount;
        let maybe = e.maybeCount;
        if (e.myStatus === 'going') going--;
        if (e.myStatus === 'maybe') maybe--;
        if (status === 'going') going++;
        if (status === 'maybe') maybe++;
        return { ...e, myStatus: status, goingCount: going, maybeCount: maybe };
      }),
    );
    try {
      await eventsApi.rsvp(ev.id, status);
    } catch (err) {
      setError(errorMessage(err));
      void load();
    }
  }

  return (
    <>
      <TopBar />
      <main className="feed">
        {error && <div className="auth-error">{error}</div>}

        <div className="events-head">
          <h1 className="section-title" style={{ margin: 0 }}>
            Eventos
          </h1>
          <button className="btn-green" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cerrar' : 'Crear evento'}
          </button>
        </div>

        {showForm && (
          <form className="card-section event-form" onSubmit={create}>
            <input
              placeholder="Título del evento"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
              required
            />
            <input
              placeholder="Lugar (opcional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <label className="event-when">
              Fecha y hora
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm({ ...form, startsAt: e.target.value })
                }
                required
              />
            </label>
            <textarea
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
            <button className="btn-green" type="submit" disabled={saving}>
              {saving ? 'Creando…' : 'Crear'}
            </button>
          </form>
        )}

        {events.length === 0 ? (
          <p className="muted">
            No hay eventos próximos. ¡Crea el primero o agrega contactos!
          </p>
        ) : (
          events.map((ev) => (
            <article key={ev.id} className="event-card">
              {ev.imageUrl && (
                <img className="event-img" src={ev.imageUrl} alt="" />
              )}
              <div className="event-date">{formatDate(ev.startsAt)}</div>
              <h2 className="event-title">{ev.title}</h2>
              {ev.location && (
                <div className="event-loc">📍 {ev.location}</div>
              )}
              {ev.description && (
                <p className="event-desc">{ev.description}</p>
              )}
              <div className="event-host">
                <Avatar
                  name={ev.host.displayName}
                  src={ev.host.avatarUrl}
                  size={26}
                />
                <span>
                  Organiza{' '}
                  <Link className="news-link" to={`/u/${ev.host.username}`}>
                    {ev.host.displayName}
                  </Link>
                </span>
              </div>
              <div className="event-counts muted">
                ✅ {ev.goingCount} van · 🤔 {ev.maybeCount} quizás
              </div>
              <div className="event-rsvp">
                {(['going', 'maybe', 'declined'] as RsvpStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`rsvp-btn ${ev.myStatus === s ? 'active' : ''}`}
                    onClick={() => rsvp(ev, s)}
                  >
                    {s === 'going' ? 'Voy' : s === 'maybe' ? 'Quizás' : 'No voy'}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </main>
    </>
  );
}

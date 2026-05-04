import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isOffice = user?.role === 'OFFICE';

  const [item, setItem] = useState(null);
  const [movements, setMovements] = useState([]);

  const [movementType, setMovementType] = useState('');
  const [movementLocation, setMovementLocation] = useState('');
  const [movementNote, setMovementNote] = useState('');

  const [jobForItem, setJobForItem] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);

  async function fetchItem() {
    try {
      const res = await api.get(`/items/${id}`);
      log('GET /items/:id', res.data);
      setItem(res.data);
    } catch (err) {
      console.error('Error fetching item', err);
      setItem(null);
    }
  }

  async function fetchMovements() {
    try {
      const res = await api.get(`/movements`, { params: { itemId: id } });
      log('GET /movements', res.data);
      setMovements(res.data);
    } catch (err) {
      console.error('Error fetching movements', err);
    }
  }

  async function fetchJobForItem() {
    if (!user) return;

    try {
      // IMPORTANT:
      // With your backend rules, DRIVER should just call /jobs/my without driverId.
      // OFFICE can still pass driverId if you want later, but for item detail this is enough.
      const res = await api.get('/jobs/my');
      log('GET /jobs/my (for item detail)', res.data);

      const job = res.data.find(
        (j) => Array.isArray(j.items) && j.items.some((it) => String(it) === String(id))
      );

      setJobForItem(job || null);
    } catch (err) {
      console.error('Error fetching job for item detail', err);
      setJobForItem(null);
    } finally {
      setLoadingJob(false);
    }
  }

  useEffect(() => {
    fetchItem();
    fetchMovements();
    fetchJobForItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?._id]);

  async function handleMovementCreate(e) {
    e.preventDefault();
    if (!movementType) return;

    try {
      const body = {
        type: movementType,
        location: movementLocation,
        note: movementNote,
      };

      log('POST /items/:id/movements body', body);

      await api.post(`/items/${id}/movements`, body);

      setMovementType('');
      setMovementLocation('');
      setMovementNote('');

      // Movement auto-updates item.status on backend, so refresh both:
      await fetchItem();
      await fetchMovements();
    } catch (err) {
      console.error('Error creating movement', err);
      alert('Failed to create movement – see console');
    }
  }

  if (!item) {
    return <div style={{ padding: '2rem' }}>Loading item...</div>;
  }

  // Role-based allowed movements (realistic workflow)
  const driverMovementOptions = [
    { value: 'PICKUP', label: 'PICKUP' },
    { value: 'MOVE', label: 'MOVE' },
    { value: 'DELIVER', label: 'DELIVER' },
  ];

  const officeMovementOptions = [
    { value: 'PICKUP', label: 'PICKUP' },
    { value: 'STORE', label: 'STORE' },
    { value: 'LOAD', label: 'LOAD' },
    { value: 'MOVE', label: 'MOVE' },
    { value: 'DELIVER', label: 'DELIVER' },
  ];

  const movementOptions = isOffice ? officeMovementOptions : driverMovementOptions;

  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/items">← Back to Items</Link>

      <h1 style={{ marginTop: '1rem' }}>Item Detail</h1>

      <p><strong>Order:</strong> {item.orderNo}</p>
      <p><strong>Customer:</strong> {item.customerName}</p>
      <p><strong>Description:</strong> {item.description || '—'}</p>
      <p><strong>Status:</strong> {item.status}</p>
      <p>
        <strong>Last seen:</strong>{' '}
        {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : '—'}
      </p>

      <p>
        <strong>Run:</strong>{' '}
        {loadingJob ? 'Checking runs…' : jobForItem ? jobForItem.title : 'Not assigned to any run'}
      </p>

      {/* ✅ STATUS CHANGES HAPPEN THROUGH MOVEMENTS ONLY */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Movements</h2>

        <form
          onSubmit={handleMovementCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}
        >
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
          >
            <option value="">Select movement type</option>
            {movementOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Location (optional)"
            value={movementLocation}
            onChange={(e) => setMovementLocation(e.target.value)}
          />

          <input
            placeholder="Note (optional)"
            value={movementNote}
            onChange={(e) => setMovementNote(e.target.value)}
          />

          <button type="submit" disabled={!movementType}>
            Add Movement
          </button>
        </form>

        {movements.length === 0 ? (
          <p style={{ marginTop: '1rem' }}>No movements recorded yet.</p>
        ) : (
          <>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#555' }}>
              Most recent first:
            </p>

            <ul style={{ marginTop: '0.5rem', paddingLeft: 0, listStyle: 'none' }}>
              {[...movements]
                .sort((a, b) => new Date(b.at) - new Date(a.at))
                .map((m, idx) => (
                  <li
                    key={m._id || idx}
                    style={{
                      borderLeft: '3px solid #444',
                      paddingLeft: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {m.at ? new Date(m.at).toLocaleString() : '—'}
                    </div>
                    <div><strong>{m.type}</strong></div>
                    {m.location && (
                      <div><strong>Location:</strong> {m.location}</div>
                    )}
                    {m.note && (
                      <div><strong>Note:</strong> {m.note}</div>
                    )}
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
// ItemDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [movements, setMovements] = useState([]);

  const [newStatus, setNewStatus] = useState('');
  const [movementType, setMovementType] = useState('');
  const [movementLocation, setMovementLocation] = useState('');
  const [movementNote, setMovementNote] = useState('');

  const [jobForItem, setJobForItem] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // NEW: office assignment helpers
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function fetchItem() {
    const res = await api.get('/items'); // simple: reuse existing endpoint
    const found = res.data.find((i) => i._id === id);
    log('ItemDetail fetchItem', found);
    setItem(found || null);
  }

  async function fetchMovements() {
    try {
      const res = await api.get(`/movements?itemId=${id}`);
      log('GET /movements', res.data);
      setMovements(res.data);
    } catch (err) {
      console.error('Error fetching movements', err);
    }
  }

  async function fetchJobForItem() {
    if (!user) return;

    setLoadingJob(true);

    try {
      let jobs = [];

      if (user.role === 'OFFICE') {
        const res = await api.get('/jobs'); // OFFICE can see all runs
        jobs = res.data;
        setAllJobs(res.data);
        log('GET /jobs (office for item detail)', res.data);
      } else {
        const res = await api.get('/jobs/my'); // DRIVER sees own runs
        jobs = res.data;
        log('GET /jobs/my (driver for item detail)', res.data);
      }

      const job = jobs.find(
        (j) =>
          Array.isArray(j.items) &&
          j.items.some((x) => String(x) === String(id))
      );

      setJobForItem(job || null);
    } catch (err) {
      console.error('Error fetching job for item detail', err);
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

  async function handleStatusUpdate() {
    if (!newStatus) return;
    try {
      await api.patch(`/items/${id}/status`, { status: newStatus });
      log('PATCH /items/:id/status', newStatus);
      await fetchItem();
      setNewStatus('');
    } catch (err) {
      console.error('Error updating status', err);
      alert('Failed to update status – see console');
    }
  }

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
      await fetchItem();
      await fetchMovements();
    } catch (err) {
      console.error('Error creating movement', err);
      alert('Failed to create movement – see console');
    }
  }

  // NEW: Assign item to a run (OFFICE only)
  async function handleAssignToRun() {
    if (!selectedJobId) return;

    try {
      setAssigning(true);

      // Get current job items so we don't overwrite
      const jobRes = await api.get(`/jobs/${selectedJobId}`);
      const currentItems = Array.isArray(jobRes.data.items) ? jobRes.data.items : [];

      // items may be populated objects or ids
      const currentIds = currentItems.map((it) => String(it._id || it));

      const nextIds = Array.from(new Set([...currentIds, String(id)]));

      await api.patch(`/jobs/${selectedJobId}/items`, { itemIds: nextIds });

      await fetchJobForItem();
      setSelectedJobId('');
      alert('Assigned to run ✅');
    } catch (err) {
      console.error('Error assigning item to run', err);
      alert('Failed to assign item – see console');
    } finally {
      setAssigning(false);
    }
  }

  if (!item) {
    return <div style={{ padding: '2rem' }}>Loading item...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Link to="/items">← Back to Items</Link>

      <h1 style={{ marginTop: '1rem' }}>Item Detail</h1>
      <p>
        <strong>Order:</strong> {item.orderNo}
      </p>
      <p>
        <strong>Customer:</strong> {item.customerName}
      </p>
      <p>
        <strong>Description:</strong> {item.description || '—'}
      </p>
      <p>
        <strong>Status:</strong> {item.status}
      </p>
      <p>
        <strong>Last seen:</strong>{' '}
        {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : '—'}
      </p>

      {/* show which run this item is on */}
      <p>
        <strong>Run:</strong>{' '}
        {loadingJob
          ? 'Checking runs…'
          : jobForItem
          ? jobForItem.title
          : 'Not assigned to any run'}
      </p>

      {/* NEW: OFFICE-only assign to run UI */}
      {user?.role === 'OFFICE' && (
        <section style={{ marginTop: '1rem' }}>
          <h3>Assign to Run (Office only)</h3>

          {allJobs.length === 0 ? (
            <p style={{ color: '#666' }}>No runs available yet. Create a run first.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">Select a run</option>
                {allJobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title} ({j.status})
                  </option>
                ))}
              </select>

              <button
                disabled={!selectedJobId || assigning}
                onClick={handleAssignToRun}
              >
                {assigning ? 'Assigning...' : 'Assign to Run'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Status update */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Update Status</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            <option value="">Select new status</option>
            <option value="PENDING">PENDING</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="IN_STORAGE">IN_STORAGE</option>
            <option value="LOADED">LOADED</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>
          <button disabled={!newStatus} onClick={handleStatusUpdate}>
            Change Status
          </button>
        </div>
      </section>

      {/* Movements */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Movements</h2>

        <form
          onSubmit={handleMovementCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}
        >
          <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <option value="">Select movement type</option>
            <option value="PICKUP">PICKUP</option>
            <option value="STORE">STORE</option>
            <option value="LOAD">LOAD</option>
            <option value="MOVE">MOVE</option>
            <option value="DELIVER">DELIVER</option>
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
                    <div>
                      <strong>{m.type}</strong>
                    </div>
                    {m.location && (
                      <div>
                        <strong>Location:</strong> {m.location}
                      </div>
                    )}
                    {m.note && (
                      <div>
                        <strong>Note:</strong> {m.note}
                      </div>
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
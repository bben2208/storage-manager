import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useAuth } from './AuthContext';

export default function OfficeItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW – filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemsRes, jobsRes] = await Promise.all([
          api.get('/items'),
          api.get('/jobs'),
        ]);

        log('OfficeItems /items', itemsRes.data);
        log('OfficeItems /jobs', jobsRes.data);

        setItems(itemsRes.data);
        setJobs(jobsRes.data);
      } catch (err) {
        console.error('Error fetching office items data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function findRunForItem(itemId) {
    for (const job of jobs) {
      const ids = new Set((job.items || []).map((id) => String(id)));
      if (ids.has(String(itemId))) {
        return job;
      }
    }
    return null;
  }

  const filteredItems = items
    .filter((item) => {
      if (statusFilter === 'ALL') return true;
      return item.status === statusFilter;
    })
    .filter((item) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (item.orderNo || '').toLowerCase().includes(term) ||
        (item.customerName || '').toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term)
      );
    });

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Office – All Items</h1>
      <p>
        Logged in as <strong>{user?.name}</strong> ({user?.role})
      </p>

      {/* Filters */}
      <section style={{ marginBottom: '1rem', marginTop: '1rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <label>
            Status:&nbsp;
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="PICKED_UP">Picked up</option>
              <option value="IN_STORAGE">In storage</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </label>

          <input
            placeholder="Search by order, customer, description"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>
      </section>

      {loading ? (
        <p>Loading items...</p>
      ) : filteredItems.length === 0 ? (
        <p>No items match your filters.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredItems.map((item) => {
            const run = findRunForItem(item._id);

            return (
              <div
                key={item._id}
                onClick={() => (window.location.href = `/items/${item._id}`)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>Order:</strong> {item.orderNo}
                </div>
                <div>
                  <strong>Customer:</strong> {item.customerName}
                </div>
                <div>
                  <strong>Description:</strong> {item.description || '—'}
                </div>
                <div>
                  <strong>Status:</strong> {item.status}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  Last seen:{' '}
                  {item.lastSeenAt
                    ? new Date(item.lastSeenAt).toLocaleString()
                    : '—'}
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  <strong>Run:</strong>{' '}
                  {run
                    ? `${run.title} (driverId: ${run.driverId})`
                    : 'Not assigned'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

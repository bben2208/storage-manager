// src/OfficeMovementsPage.jsx
import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useAuth } from './AuthContext';

const typeLabels = {
  PICKUP: 'Pickup',
  DELIVER: 'Delivery',
  IN_STORAGE: 'In storage',
};

export default function OfficeMovementsPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [movRes, itemsRes] = await Promise.all([
          api.get('/movements'),
          api.get('/items'),
        ]);

        log('OfficeMovements /movements', movRes.data);
        log('OfficeMovements /items', itemsRes.data);

        setMovements(movRes.data);
        setItems(itemsRes.data);
      } catch (err) {
        console.error('Error loading movements', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // helper: map items by id so we can show orderNo, customer etc.
  const itemMap = React.useMemo(() => {
    const map = {};
    for (const item of items) {
      map[item._id] = item;
    }
    return map;
  }, [items]);

  // decorate movements with item info
  const enriched = movements
    .map((m) => {
      const item = itemMap[m.itemId] || {};
      return {
        ...m,
        itemOrderNo: item.orderNo,
        itemCustomer: item.customerName,
        itemDescription: item.description,
      };
    })
    // newest first
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // apply filters
  const filtered = enriched
    .filter((m) => {
      if (typeFilter === 'ALL') return true;
      return m.type === typeFilter;
    })
    .filter((m) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (m.itemOrderNo || '').toLowerCase().includes(term) ||
        (m.itemCustomer || '').toLowerCase().includes(term) ||
        (m.itemDescription || '').toLowerCase().includes(term) ||
        (m.location || '').toLowerCase().includes(term)
      );
    });

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Office – Movements Log</h1>
      <p>
        Logged in as <strong>{user?.name}</strong> ({user?.role})
      </p>

      {/* Filters */}
      <section style={{ margin: '1rem 0' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <label>
            Type:&nbsp;
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="PICKUP">Pickup</option>
              <option value="DELIVER">Delivery</option>
              <option value="IN_STORAGE">In storage</option>
            </select>
          </label>

          <input
            placeholder="Search by order, customer, description, location"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 300 }}
          />
        </div>
      </section>

      {/* List / table */}
      {loading ? (
        <p>Loading movements...</p>
      ) : filtered.length === 0 ? (
        <p>No movements match your filters.</p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Order</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m._id}>
                <td style={tdStyle}>
                  {m.createdAt
                    ? new Date(m.createdAt).toLocaleString()
                    : '—'}
                </td>
                <td style={tdStyle}>{m.itemOrderNo || '—'}</td>
                <td style={tdStyle}>{m.itemCustomer || '—'}</td>
                <td style={tdStyle}>{typeLabels[m.type] || m.type}</td>
                <td style={tdStyle}>{m.location || '—'}</td>
                <td style={tdStyle}>{m.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: '0.5rem',
};

const tdStyle = {
  borderBottom: '1px solid #eee',
  padding: '0.5rem',
};
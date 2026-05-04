import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ItemsPage() {
  const { user } = useAuth();
  const isOffice = user?.role === 'OFFICE';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [orderNo, setOrderNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');

  // filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await api.get('/items');
        log('GET /items', res.data);
        setItems(res.data);
      } catch (err) {
        console.error('Error loading items', err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();

    // ✅ extra safety: drivers can't create items
    if (!isOffice) {
      alert('Only OFFICE users can create items.');
      return;
    }

    const body = {
      orderNo,
      customerName,
      description,
    };

    try {
      log('POST /items body', body);
      const res = await api.post('/items', body);
      log('POST /items response', res.data);

      setItems((prev) => [res.data, ...prev]);
      setOrderNo('');
      setCustomerName('');
      setDescription('');
    } catch (err) {
      console.error('Error creating item', err);

      // nicer message for permission issues
      if (err?.response?.status === 403) {
        alert('Forbidden: Only OFFICE users can create items.');
      } else {
        alert('Failed to create item');
      }
    }
  }

  // ---------- FILTERED ITEMS ----------
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
      <h1>Items</h1>

      {/* Create item (OFFICE only) */}
      {isOffice ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Create New Item</h2>
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxWidth: 400,
            }}
          >
            <input
              placeholder="Order number"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
            />
            <input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              placeholder="Description (IKEA kitchen, sofa, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit" disabled={!orderNo || !customerName}>
              Add Item
            </button>
          </form>
        </section>
      ) : (
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ color: '#666', marginTop: 0 }}>
            Items are created by the office. You can update items by logging movements.
          </p>
        </section>
      )}

      {/* Filters */}
      <section style={{ marginBottom: '1rem' }}>
        <h2>Current Items</h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            marginBottom: '0.75rem',
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
            style={{ minWidth: 240 }}
          />
        </div>
      </section>

      {/* Items list */}
      {loading ? (
        <p>Loading items...</p>
      ) : filteredItems.length === 0 ? (
        <p>No items match your filters.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredItems.map((item) => (
            <Link
              key={item._id}
              to={`/items/${item._id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// src/MyRunsPage.jsx
import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';

export default function MyRunsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user?._id) return;

    async function fetchData() {
      try {
        const [jobsRes, itemsRes] = await Promise.all([
          api.get('/jobs/my'),
          api.get('/items'),
        ]);

        log('MyRuns /jobs/my', jobsRes.data);
        log('MyRuns /items', itemsRes.data);

        setJobs(jobsRes.data);
        setItems(itemsRes.data);
      } catch (err) {
        console.error('Error loading my runs', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?._id]);

  function getStatsForJob(job) {
    const jobItemIds = new Set((job.items || []).map((id) => String(id)));
    const itemsOnJob = items.filter((item) => jobItemIds.has(String(item._id)));

    const total = itemsOnJob.length;
    const delivered = itemsOnJob.filter((i) => i.status === 'DELIVERED').length;

    return { total, delivered };
  }

  const filteredJobs = jobs
    .filter((job) => (statusFilter === 'ALL' ? true : job.status === statusFilter))
    .filter((job) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (job.title || '').toLowerCase().includes(term) ||
        (job.pickupLocation || '').toLowerCase().includes(term) ||
        (job.dropoffLocation || '').toLowerCase().includes(term) ||
        (job.van || '').toLowerCase().includes(term)
      );
    });

  return (
    <div style={{ padding: '2rem' }}>
      <h1>My Runs</h1>
      <p>
        Driver: <strong>{user?.name}</strong>
      </p>

      <section style={{ marginBottom: '1rem' }}>
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
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>

          <input
            placeholder="Search by title, pickup, dropoff, van"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>
      </section>

      {loading ? (
        <p>Loading runs...</p>
      ) : filteredJobs.length === 0 ? (
        <p>No runs match your filters.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.75rem' }}>
          {filteredJobs.map((job) => {
            const stats = getStatsForJob(job);
            return (
              <li
                key={job._id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                }}
              >
                <Link to={`/runs/${job._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <strong>{job.title}</strong>
                  </div>
                  <div>
                    <strong>Pickup:</strong> {job.pickupLocation} <strong>→</strong> {job.dropoffLocation}
                  </div>
                  {job.van && (
                    <div>
                      <strong>Van:</strong> {job.van}
                    </div>
                  )}
                  <div>
                    <strong>Status:</strong> {job.status}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    Scheduled: {job.scheduledDate ? new Date(job.scheduledDate).toLocaleString() : '—'}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                    <strong>Items:</strong> {stats.total} ({stats.delivered} delivered)
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

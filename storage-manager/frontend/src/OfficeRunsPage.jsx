// src/OfficeRunsPage.jsx
import React, { useEffect, useState } from 'react';
import { api, log } from './api';
import { useAuth } from './AuthContext';

export default function OfficeRunsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW – filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, itemsRes] = await Promise.all([
          api.get('/jobs'),
          api.get('/items'),
        ]);

        log('OfficeRuns /jobs', jobsRes.data);
        log('OfficeRuns /items', itemsRes.data);

        setJobs(jobsRes.data);
        setItems(itemsRes.data);
      } catch (err) {
        console.error('Error fetching office runs data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function getStatsForJob(job) {
    const jobItemIds = new Set((job.items || []).map((id) => String(id)));
    const itemsOnJob = items.filter((item) =>
      jobItemIds.has(String(item._id))
    );

    const total = itemsOnJob.length;
    const delivered = itemsOnJob.filter((i) => i.status === 'DELIVERED').length;

    return { total, delivered };
  }

  const filteredJobs = jobs
    .filter((job) => {
      if (statusFilter === 'ALL') return true;
      return job.status === statusFilter;
    })
    .filter((job) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (job.title || '').toLowerCase().includes(term) ||
        (job.pickupLocation || '').toLowerCase().includes(term) ||
        (job.dropoffLocation || '').toLowerCase().includes(term) ||
        (job.van || '').toLowerCase().includes(term) ||
        (job.driverId || '').toLowerCase().includes(term)
      );
    });

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Office – All Runs</h1>
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
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>

          <input
            placeholder="Search by title, pickup, dropoff, van, driverId"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 280 }}
          />
        </div>
      </section>

      {loading ? (
        <p>Loading runs...</p>
      ) : filteredJobs.length === 0 ? (
        <p>No runs match your filters.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '1rem' }}>
          {filteredJobs.map((job, idx) => {
            const stats = getStatsForJob(job);

            return (
              <li
                key={job._id || idx}
                onClick={() => (window.location.href = `/runs/${job._id}`)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>{job.title}</strong>
                </div>
                <div>
                  <strong>Pickup:</strong> {job.pickupLocation}{' '}
                  <strong>→</strong> {job.dropoffLocation}
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
                  Driver ID: {job.driverId}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  Scheduled:{' '}
                  {job.scheduledDate
                    ? new Date(job.scheduledDate).toLocaleString()
                    : '—'}
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  <strong>Items:</strong> {stats.total} ({stats.delivered} delivered)
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

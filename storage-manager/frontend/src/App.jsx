import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import ItemsPage from './ItemsPage';
import ItemDetailPage from './ItemDetailPage';
import MyRunsPage from './MyRunsPage';
import JobDetailPage from './JobDetailPage';
import { api, log } from './api';
import OfficeRunsPage from './OfficeRunsPage';
import OfficeItemsPage from './OfficeItemsPage';
import OfficeMovementsPage from './OfficeMovementsPage';

function LoginPage() {
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err) {
      console.error('Login error', err);
      alert('Login failed – check console for details');
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Storage Manager – Login</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', maxWidth: 300, gap: 8 }}
      >
        <input name="email" placeholder="Email" defaultValue="driver@storage-manager.test" />
        <input name="password" placeholder="Password" type="password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function HomePage() {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      if (!user) {
        setLoadingSummary(false);
        return;
      }

      try {
        const [itemsRes, jobsRes] = await Promise.all([
          api.get('/items'),
          api.get('/jobs/my')
                ]);

        log('Home summary /items', itemsRes.data);
        log('Home summary /jobs/my', jobsRes.data);

        const items = itemsRes.data;
        const jobs = jobsRes.data;

        const totalItems = items.length;
        const deliveredItems = items.filter((i) => i.status === 'DELIVERED').length;
        const pendingItems = totalItems - deliveredItems;

        const totalJobs = jobs.length;
        const plannedJobs = jobs.filter((j) => j.status === 'PLANNED').length;
        const inProgressJobs = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
        const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;

        const today = new Date();
        const isSameDay = (d1, d2) =>
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();

        const runsToday = jobs
          .filter((job) => {
            if (!job.scheduledDate) return false;
            const d = new Date(job.scheduledDate);
            return isSameDay(today, d);
          })
          .map((job) => {
            const jobItemIds = new Set((job.items || []).map((id) => String(id)));
            const itemsOnJob = items.filter((item) => jobItemIds.has(String(item._id)));

            const totalOnJob = itemsOnJob.length;
            const deliveredOnJob = itemsOnJob.filter(
              (i) => i.status === 'DELIVERED'
            ).length;

            return {
              _id: job._id,
              title: job.title,
              pickupLocation: job.pickupLocation,
              dropoffLocation: job.dropoffLocation,
              van: job.van,
              status: job.status,
              scheduledDate: job.scheduledDate,
              totalOnJob,
              deliveredOnJob,
            };
          });

        setSummary({
          totalItems,
          deliveredItems,
          pendingItems,
          totalJobs,
          plannedJobs,
          inProgressJobs,
          completedJobs,
          runsToday,
        });
      } catch (err) {
        console.error('Error fetching home summary', err);
      } finally {
        setLoadingSummary(false);
      }
    }

    fetchSummary();
  }, [user?._id]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Storage Manager – Home</h1>
      <p>
        Welcome, <strong>{user?.name}</strong> ({user?.role})
      </p>

      <nav style={{ margin: '1rem 0', display: 'flex', gap: '1rem' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/items">Items</Link>
        <Link to="/runs">My Runs</Link>

        {user?.role === 'OFFICE' && (
          <>
            <span style={{ margin: '0 0.5rem' }}>|</span>
            <Link to="/office/items">Office Items</Link>
            <Link to="/office/runs">Office Runs</Link>
            <Link to="/office/movements">Office Movements</Link> 
          </>
        )}
      </nav>

      {/* summary cards */}
      <section style={{ marginTop: '1.5rem' }}>
        <h2>Today&apos;s Overview</h2>

        {loadingSummary ? (
          <p>Loading overview...</p>
        ) : !summary ? (
          <p>No data yet.</p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '0.75rem',
            }}
          >
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '0.75rem 1rem',
                minWidth: 180,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Items</h3>
              <p style={{ margin: 0 }}>
                <strong>Total:</strong> {summary.totalItems}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Delivered:</strong> {summary.deliveredItems}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Not delivered:</strong> {summary.pendingItems}
              </p>
            </div>

            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '0.75rem 1rem',
                minWidth: 220,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Runs</h3>
              <p style={{ margin: 0 }}>
                <strong>Total:</strong> {summary.totalJobs}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Planned:</strong> {summary.plannedJobs}
              </p>
              <p style={{ margin: 0 }}>
                <strong>In progress:</strong> {summary.inProgressJobs}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Completed:</strong> {summary.completedJobs}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Today's runs */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Today&apos;s Runs</h2>

        {loadingSummary ? (
          <p>Loading runs...</p>
        ) : !summary || !summary.runsToday ? (
          <p>No data.</p>
        ) : summary.runsToday.length === 0 ? (
          <p>No runs scheduled for today.</p>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.75rem' }}>
            {summary.runsToday.map((run, idx) => (
              <li
                key={run._id || idx}
                onClick={() => (window.location.href = `/runs/${run._id}`)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>{run.title}</strong>
                </div>
                <div>
                  <strong>Pickup:</strong> {run.pickupLocation}{' '}
                  <strong>→</strong> {run.dropoffLocation}
                </div>
                {run.van && (
                  <div>
                    <strong>Van:</strong> {run.van}
                  </div>
                )}
                <div>
                  <strong>Status:</strong> {run.status}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  Scheduled:{' '}
                  {run.scheduledDate
                    ? new Date(run.scheduledDate).toLocaleString()
                    : '—'}
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  <strong>Items:</strong> {run.totalOnJob} ({' '}
                  {run.deliveredOnJob} delivered )
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <p>This is your protected home. Use the navigation above to manage runs and items.</p>
        <button onClick={logout}>Logout</button>
      </section>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem' }}>Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OfficeRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem' }}>Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'OFFICE') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/items"
            element={
              <ProtectedRoute>
                <ItemsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/items/:id"
            element={
              <ProtectedRoute>
                <ItemDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/runs"
            element={
              <ProtectedRoute>
                <MyRunsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/runs/:id"
            element={
              <ProtectedRoute>
                <JobDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/office/items"
            element={
              <OfficeRoute>
                <OfficeItemsPage />
              </OfficeRoute>
            }
          />

          <Route
            path="/office/runs"
            element={
              <OfficeRoute>
                <OfficeRunsPage />
              </OfficeRoute>
            }
          />
          <Route
            path="/office/movements"
            element={
              <OfficeRoute>
                <OfficeMovementsPage />
              </OfficeRoute>
            }
          />

          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

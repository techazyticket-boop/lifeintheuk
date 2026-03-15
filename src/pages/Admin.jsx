import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isMockMode } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Users, CreditCard, Activity, Search, Calendar, Database } from 'lucide-react';
import PromoManager from '../admin/PromoManager';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'techazyticket@gmail.com';

export default function Admin() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ activeSubs: 0, totalUsers: 0, monthlyRev: 0, weeklyRev: 0 });
    const [subscriptions, setSubscriptions] = useState([]);
    const [filteredSubs, setFilteredSubs] = useState([]);
    const [userStats, setUserStats] = useState({ totalExams: 0, avgScore: 0 });
    const [chartData, setChartData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        // Only allow admin
        if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            navigate('/dashboard', { replace: true });
            return;
        }

        async function fetchAdminData() {
            if (isMockMode) {
                // Mock data fallback if supabase isn't configured
                setStats({ activeSubs: 42, totalUsers: 380, monthlyRev: 168, weeklyRev: 36 });
                setUserStats({ totalExams: 2150, avgScore: 18 });
                setSubscriptions([
                    { email: 'john@email.com', plan: 'monthly', status: 'active', startDate: '2026-02-01', endDate: '2026-03-01' },
                    { email: 'sarah@email.com', plan: 'weekly', status: 'expired', startDate: '2026-01-10', endDate: '2026-01-17' },
                ]);
                setChartData([
                    { name: 'Jan', count: 12 },
                    { name: 'Feb', count: 30 },
                    { name: 'Mar', count: 42 }
                ]);
                setLoading(false);
                return;
            }

            try {
                // Fetch Users to get email references
                const { data: usersData, count: usersCount } = await supabase
                    .from('users')
                    .select('id, email', { count: 'exact' });

                const usersMap = {};
                if (usersData) {
                    usersData.forEach(u => usersMap[u.id] = u.email);
                }

                // Fetch Subscriptions
                const { data: subsData } = await supabase
                    .from('subscriptions')
                    .select('user_id, plan, status, stripe_subscription_id, current_period_end, created_at')
                    .order('created_at', { ascending: false });

                let processedSubs = [];
                if (subsData) {
                    processedSubs = subsData.map(sub => ({
                        email: usersMap[sub.user_id] || 'Unknown User',
                        plan: sub.plan || 'unknown',
                        status: sub.status || 'unknown',
                        startDate: sub.created_at ? new Date(sub.created_at).toISOString().split('T')[0] : 'N/A',
                        endDate: sub.current_period_end ? new Date(sub.current_period_end).toISOString().split('T')[0] : 'N/A'
                    }));
                }

                // Calculate Subscription Metrics
                const activeSubsList = processedSubs.filter(s => s.status === 'active' || s.status === 'trialing');
                const monthlyActive = activeSubsList.filter(s => s.plan === 'monthly').length;
                const weeklyActive = activeSubsList.filter(s => s.plan === 'weekly').length;

                const monthlyRev = Math.round(monthlyActive * 9.99);
                const weeklyRev = Math.round(weeklyActive * 3.99);

                setStats({
                    activeSubs: activeSubsList.length,
                    totalUsers: usersCount || 0,
                    monthlyRev,
                    weeklyRev
                });

                setSubscriptions(processedSubs);

                // Fetch Exam Attempts
                let totalExams = 0;
                let avgScore = 0;

                // Attempt to fetch from requested table 'exam_attempts'
                const { data: examsData, error: examsError } = await supabase
                    .from('exam_attempts')
                    .select('score');

                if (!examsError && examsData) {
                    totalExams = examsData.length;
                    if (totalExams > 0) {
                        const sum = examsData.reduce((acc, curr) => acc + (curr.score || 0), 0);
                        avgScore = Math.round(sum / totalExams);
                    }
                } else if (examsError) {
                    // Fallback to user_progress if exam_attempts table not found to prevent breaking
                    const { data: progressData } = await supabase.from('user_progress').select('score');
                    if (progressData) {
                        totalExams = progressData.length;
                        if (totalExams > 0) {
                            const sum = progressData.reduce((acc, curr) => acc + (curr.score || 0), 0);
                            avgScore = Math.round(sum / totalExams);
                        }
                    }
                }

                setUserStats({ totalExams, avgScore });

                // Construct Chart Data
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const countsByMonth = {};

                activeSubsList.forEach(sub => {
                    if (sub.startDate !== 'N/A') {
                        const date = new Date(sub.startDate);
                        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
                        countsByMonth[monthKey] = (countsByMonth[monthKey] || 0) + 1;
                    }
                });

                let chart = Object.keys(countsByMonth).map(k => ({ name: k, count: countsByMonth[k] }));
                if (chart.length === 0) {
                    chart = [{ name: 'Current', count: activeSubsList.length }];
                }
                setChartData(chart);

            } catch (err) {
                console.error('Admin Dashboard fetch failed:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAdminData();
    }, [user, navigate, isMockMode]);

    // Handle Search and Filter
    useEffect(() => {
        let res = subscriptions;
        if (statusFilter !== 'all') {
            res = res.filter(s => s.status === statusFilter);
        }
        if (searchTerm) {
            res = res.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredSubs(res);
    }, [searchTerm, statusFilter, subscriptions]);

    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;

    if (loading) {
        return (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading admin matrix...
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' }}>
                <Shield size={32} color="var(--accent-primary)" />
                <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>Admin Portal</h1>
            </div>

            {/* Overview Section */}
            <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>Overview</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-2xl)'
            }}>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-xs)' }}>Active Subscriptions</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CreditCard size={24} color="var(--success)" /> {stats.activeSubs}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-xs)' }}>Total Users</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={24} color="var(--accent-primary)" /> {stats.totalUsers}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-xs)' }}>Estimated Monthly Revenue</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>£{stats.monthlyRev}</div>
                </div>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-xs)' }}>Weekly Revenue Run Rate</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>£{stats.weeklyRev}</div>
                </div>
            </div>

            {/* User Statistics & Chart Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>

                {/* User Statistics */}
                <div className="glass-panel" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
                        <Activity size={20} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Platform Activity (Exams)</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1, justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Exams Taken</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{userStats.totalExams.toLocaleString()}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Average Score</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{userStats.avgScore} / 24</span>
                        </div>
                    </div>
                </div>

                {/* Timeline Chart */}
                <div className="glass-panel" style={{ padding: 'var(--space-xl)', minHeight: 300 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
                        <Calendar size={20} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>New Subscriptions Timeline</h2>
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Subscription Table */}
            <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
                    <Database size={20} color="var(--accent-primary)" />
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Subscription Management</h2>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 10px 10px 36px',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)', color: 'white', outline: 'none'
                            }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '10px 16px', background: 'rgba(15,23,42,1)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                            color: 'white', outline: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                        <option value="trialing">Trialing</option>
                    </select>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>User Email</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Plan</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Start Date</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>End Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubs.map((sub, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px 16px', fontWeight: 500 }}>{sub.email}</td>
                                    <td style={{ padding: '16px 16px', textTransform: 'capitalize' }}>{sub.plan}</td>
                                    <td style={{ padding: '16px 16px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                            background: sub.status === 'active' || sub.status === 'trialing' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: sub.status === 'active' || sub.status === 'trialing' ? 'var(--success)' : 'var(--danger)',
                                            textTransform: 'uppercase'
                                        }}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 16px' }}>{sub.startDate}</td>
                                    <td style={{ padding: '16px 16px' }}>{sub.endDate}</td>
                                </tr>
                            ))}
                            {filteredSubs.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No subscriptions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Promo Manager Section */}
            <PromoManager />

        </div>
    );
}

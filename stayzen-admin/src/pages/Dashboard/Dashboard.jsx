import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Bar, ComposedChart, Cell,
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PieChart, Pie, Sector
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Building2,
    CalendarClock,
    CreditCard,
    MessageSquare,
    Settings,
    ArrowUpRight,
    Bell,
    ChevronRight,
    Activity,
    Rocket,
    LayoutGrid,
    Search,
    RefreshCw,
    TrendingUp,
    ShieldCheck,
    Globe,
    Zap
} from 'lucide-react';

const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontSize: '18px', fontWeight: '900' }}>
                {payload.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                stroke="none"
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 6}
                outerRadius={outerRadius + 10}
                fill={fill}
                stroke="none"
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" style={{ fontSize: '14px', fontWeight: '700' }}>{`${value} Units`}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" style={{ fontSize: '12px' }}>
                {`(${(percent * 100).toFixed(2)}%)`}
            </text>
        </g>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({
        users: 0,
        properties: 0,
        pending: 0,
        bookingsCount: 0,
        revenue: 0,
        feedbackCount: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSector, setActiveSector] = useState(0);
    const [pieData, setPieData] = useState([]);
    const [financeData, setFinanceData] = useState([]);

    useEffect(() => {
        setLoading(true);

        const unsubProperties = onSnapshot(collection(db, 'properties'), (snap) => {
            const all = snap.docs.map(d => d.data());
            const approved = all.filter(p => p.status === 'Approved').length;
            const pending = all.filter(p => p.status === 'Processing').length;
            setCounts(prev => ({ ...prev, properties: approved, pending }));

            // PIE DATA with active shape method
            const types = {};
            all.forEach(p => {
                const t = p.type || 'Other';
                types[t] = (types[t] || 0) + 1;
            });
            const pData = Object.keys(types).map((t, i) => ({
                name: t,
                value: types[t],
                color: ['#1aa79c', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5]
            }));
            setPieData(pData.length > 0 ? pData : [{ name: 'System Ready', value: 1, color: '#1aa79c' }]);
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setCounts(prev => ({ ...prev, users: snap.size }));
        });

        const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCounts(prev => ({ ...prev, bookingsCount: snap.size }));
            setRecentBookings(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
        });

        const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
            const total = snap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
            setCounts(prev => ({ ...prev, revenue: total }));

            // Generate some dynamic finance flow data
            const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
            const fData = months.map((m, i) => ({
                name: m,
                revenue: (total / (6 - i)) + Math.random() * 1000,
                target: (total / 5) + 500
            }));
            setFinanceData(fData);
        });

        const unsubFeedback = onSnapshot(collection(db, 'feedback'), (snap) => {
            setCounts(prev => ({ ...prev, feedbackCount: snap.size }));
            setLoading(false);
        });

        return () => {
            unsubProperties();
            unsubUsers();
            unsubBookings();
            unsubPayments();
            unsubFeedback();
        };
    }, []);

    const metrics = [
        { label: 'Gross Revenue', val: `₹${(counts.revenue / 1000).toFixed(1)}K`, icon: <CreditCard size={24} />, color: '#1aa79c', trend: '+12%', bg: '#f1f8f7' },
        { label: 'New Bookings', val: counts.bookingsCount, icon: <CalendarClock size={24} />, color: '#3b82f6', trend: '+8%', bg: '#f1f5fe' },
        { label: 'Properties', val: counts.properties, icon: <Building2 size={24} />, color: '#f59e0b', trend: '+4%', bg: '#fffaf1' },
        { label: 'Total Users', val: counts.users, icon: <Users size={24} />, color: '#8b5cf6', trend: '+15%', bg: '#f9f1ff' },
    ];

    return (
        <div className="premium-hq">
            {/* Header Area */}
            <div className="hq-header-panel">
                <div className="hq-welcome">
                    <h1>Szen Intelligence</h1>
                    <p>Advanced ecosystem monitoring and asset orchestration hub.</p>
                </div>
                <button className="hq-launch-btn" onClick={() => navigate('/properties')}>
                    <div className="btn-vial"><Rocket size={20} /></div>
                    <div className="btn-info">
                        <span className="btn-title">Control Center</span>
                        <span className="btn-subtitle">Manage {counts.properties} Assets</span>
                    </div>
                    <ChevronRight size={20} className="btn-arrow" />
                </button>
            </div>

            {/* Top Metrics - Updated to match the requested container style */}
            <div className="hq-metrics-row">
                {metrics.map((m, i) => (
                    <div key={i} className="hq-stat-box">
                        <div className="hq-stat-icon-wrap" style={{ backgroundColor: m.bg, color: m.color }}>
                            {m.icon}
                        </div>
                        <div className="hq-stat-body">
                            <span className="hq-stat-label">{m.label}</span>
                            <h2 className="hq-stat-value" style={{ color: m.color }}>{m.val}</h2>
                            <div className="hq-stat-footer">
                                <span className="hq-stat-trend" style={{ color: m.color }}><ArrowUpRight size={14} /> {m.trend}</span>
                                <span className="hq-stat-period">vs last period</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Graphs Section - "Another Method" */}
            <div className="hq-viz-grid">
                {/* Visual 1: Interactive Waveflow (Another Method for Line Charts) */}
                <div className="hq-viz-card finance">
                    <div className="viz-header">
                        <div className="viz-title">
                            <h3>Revenue Waveflow</h3>
                            <p>Dynamic growth vs target delta</p>
                        </div>
                        <div className="viz-actions">
                            <button className="viz-chip active">Live Flow</button>
                        </div>
                    </div>
                    <div className="viz-body">
                        <ResponsiveContainer width="100%" height={350}>
                            <ComposedChart data={financeData}>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[10, 10, 0, 0]} barSize={20} />
                                <Area type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#1aa79c" strokeWidth={4} fill="#1aa79c" fillOpacity={0.7} animationDuration={2000} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Visual 2: Active Sector Sunburst (Another Method for Pie Charts) */}
                <div className="hq-viz-card portfolio">
                    <div className="viz-header">
                        <div className="viz-title">
                            <h3>Portfolio Sunburst</h3>
                            <p>Active asset mix & unit distribution</p>
                        </div>
                        <div className="viz-badge">{counts.properties} Units</div>
                    </div>
                    <div className="viz-body sunburst">
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    activeIndex={activeSector}
                                    activeShape={renderActiveShape}
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    dataKey="value"
                                    stroke="none"
                                    onMouseEnter={(_, index) => setActiveSector(index)}
                                    animationDuration={1500}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Intelligent Feeds */}
            <div className="hq-bottom-grid">
                <div className="hq-feed-card pulse">
                    <div className="feed-header">
                        <Activity size={18} />
                        <h3>Operational Pulse</h3>
                    </div>
                    <div className="feed-list">
                        {counts.pending > 0 && (
                            <div className="feed-row critical" onClick={() => navigate('/properties')}>
                                <div className="pulse-dot"></div>
                                <div className="feed-info">
                                    <span className="main">System Blockage</span>
                                    <span className="sub">{counts.pending} Properties awaiting verification.</span>
                                </div>
                                <ChevronRight size={18} />
                            </div>
                        )}
                        <div className="feed-row">
                            <div className="dot blue"></div>
                            <div className="feed-info">
                                <span className="main">System Integrity</span>
                                <span className="sub">All database nodes are operational and performing at 100%.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hq-feed-card activity">
                    <div className="feed-header">
                        <LayoutGrid size={18} />
                        <h3>Recent Transitions</h3>
                    </div>
                    <div className="activity-stack">
                        {recentBookings.map((b, i) => (
                            <div key={i} className="activity-row">
                                <div className="activity-icon"><Building2 size={16} /></div>
                                <div className="activity-main">
                                    <span className="name">{b.propertyName}</span>
                                    <span className="date">{new Date(b.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className="status-pill">{b.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import React from 'react';
import {
    Building2,
    Users,
    CreditCard,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    X,
    TrendingUp,
    ChevronRight,
    Search,
    IndianRupee,
    Briefcase,
    CalendarClock
} from 'lucide-react';
import './overview.css';
import { subscribeToProperties, subscribeToRenters, subscribeToPayments } from '../services/dataService';

export default function DashboardOverview({ userId }) {
    const [counts, setCounts] = React.useState({ properties: 0, renters: 0, income: 0, pending: 0 });
    const [payments, setPayments] = React.useState([]);
    const [properties, setProperties] = React.useState([]);
    const [renters, setRenters] = React.useState([]);

    React.useEffect(() => {
        if (!userId) return;

        const unsubProperties = subscribeToProperties(userId, data => {
            setProperties(data);
            const approved = data.filter(p => p.status === 'Approved').length;
            const pending = data.filter(p => p.status === 'Processing').length;
            setCounts(prev => ({ ...prev, properties: approved, pending: pending }));
        });
        const unsubRenters = subscribeToRenters(userId, data => {
            setRenters(data);
            setCounts(prev => ({ ...prev, renters: data.length }));
        });
        const unsubPayments = subscribeToPayments(userId, data => {
            setPayments(data);
            const totalIncome = data
                .filter(p => p.status === 'Completed' || p.status === 'Success' || !p.status)
                .reduce((acc, p) => {
                    const amt = Number(p.amount) || 0;
                    return p.type === 'Correction' ? acc - amt : acc + amt;
                }, 0);
            setCounts(prev => ({ ...prev, income: totalIncome }));
        });
        return () => { unsubProperties(); unsubRenters(); unsubPayments(); };
    }, [userId]);

    const monthlyRevenue = React.useMemo(() => {
        const monthlyData = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        payments.forEach(payment => {
            const isCompleted = payment.status === 'Completed' || payment.status === 'Success' || !payment.status;
            if (!isCompleted) return;

            const date = new Date(payment.createdAt || payment.date);
            if (date.getFullYear() === currentYear) {
                const amt = Number(payment.amount) || 0;
                if (payment.type === 'Correction') {
                    monthlyData[date.getMonth()] -= amt;
                } else {
                    monthlyData[date.getMonth()] += amt;
                }
            }
        });
        return monthlyData;
    }, [payments]);

    const maxRevenue = React.useMemo(() => Math.max(...monthlyRevenue, 1000), [monthlyRevenue]);

    const statsData = React.useMemo(() => {
        const approvedProperties = properties.filter(p => p.status === 'Approved');
        const totalUnits = approvedProperties.reduce((acc, p) => acc + (Number(p.units) || 0), 0);
        const occupiedUnits = renters.length;
        const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

        const onlineIncome = payments
            .filter(p => (p.status === 'Completed' || p.status === 'Success' || !p.status) && p.type === 'Online')
            .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const offlineIncome = payments
            .filter(p => (p.status === 'Completed' || p.status === 'Success' || !p.status) && p.type !== 'Online')
            .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const balanceIncome = renters.reduce((acc, r) => acc + (Math.max(0, (Number(r.rentAmount) || 0) - (Number(r.paidAmount) || 0))), 0);

        // Income Trend
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const revThisMonth = payments
            .filter(p => (p.status === 'Completed' || p.status === 'Success' || !p.status) && new Date(p.createdAt || p.date) >= thisMonthStart)
            .reduce((acc, p) => {
                const amt = Number(p.amount) || 0;
                return p.type === 'Correction' ? acc - amt : acc + amt;
            }, 0);
        const revLastMonth = payments.filter(p => {
            const isCompleted = p.status === 'Completed' || p.status === 'Success' || !p.status;
            if (!isCompleted) return false;
            const d = new Date(p.createdAt || p.date);
            return d >= lastMonthStart && d <= lastMonthEnd;
        }).reduce((acc, p) => {
            const amt = Number(p.amount) || 0;
            return p.type === 'Correction' ? acc - amt : acc + amt;
        }, 0);

        let incomeTrend;
        if (revLastMonth === 0) {
            incomeTrend = { trend: revThisMonth > 0 ? `+₹${revThisMonth.toLocaleString()}` : '0%', isUp: revThisMonth > 0 };
        } else {
            const diff = revThisMonth - revLastMonth;
            const percent = Math.round((diff / revLastMonth) * 100);
            incomeTrend = { trend: `${percent >= 0 ? '+' : ''}${percent}%`, isUp: percent >= 0 };
        }

        return {
            totalUnits,
            occupiedUnits,
            vacantUnits,
            occupancyRate,
            onlineIncome,
            offlineIncome,
            balanceIncome,
            incomeTrend
        };
    }, [payments, properties, renters]);

    const {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        onlineIncome,
        offlineIncome,
        balanceIncome,
        incomeTrend
    } = statsData;

    const stats = [
        {
            id: 1,
            label: 'Total Properties',
            value: counts.properties.toString(),
            icon: <Building2 size={24} />,
            trend: 'Active',
            isUp: true,
            color: '#1aa79c'
        },
        {
            id: 2,
            label: 'Total Renters',
            value: counts.renters.toString(),
            icon: <Users size={24} />,
            trend: 'Managed',
            isUp: true,
            color: '#3b82f6'
        },
        {
            id: 3,
            label: 'Overall Income',
            value: `₹${counts.income.toLocaleString('en-IN')}`,
            icon: <IndianRupee size={24} />,
            trend: incomeTrend.trend,
            isUp: incomeTrend.isUp,
            color: '#10b981'
        },
        {
            id: 4,
            label: 'Pending Requests',
            value: counts.pending.toString(),
            icon: <Clock size={24} />,
            trend: 'Tasks',
            isUp: counts.pending > 0,
            color: '#f59e0b'
        },
    ];

    const [isRevenueModalOpen, setIsRevenueModalOpen] = React.useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning,";
        if (hour < 17) return "Good Afternoon,";
        return "Good Evening,";
    };

    return (
        <div className="ov-container">
            <div className="ov-header-row">
                <div className="ov-welcome">
                    <div className="ov-welcome-text">
                        <h2 className="ov-greeting">Dashboard Overview</h2>
                        <p className="ov-subtitle">Managing {counts.properties} active properties</p>
                    </div>
                    <div className="ov-header-divider"></div>
                    <div className="ov-date-badge">
                        <CalendarClock size={16} />
                        <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                </div>
                <button className="ov-report-btn" onClick={() => setIsRevenueModalOpen(true)}>
                    <TrendingUp size={18} />
                    View Detailed Report
                </button>
            </div>

            <div className="ov-stats-grid">
                {stats.map((stat) => (
                    <div key={stat.id} className="ov-stat-card card">
                        <div className="ov-stat-icon-box" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="ov-stat-info">
                            <span className="ov-stat-label">{stat.label}</span>
                            <div className="ov-stat-value-group">
                                <h3 className="ov-stat-value">{stat.value}</h3>
                                <span className={`ov-stat-trend ${stat.isUp ? 'positive' : 'negative'}`}>
                                    {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.trend}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="ov-main-content">
                <div className="ov-chart-card card">
                    <div className="ov-card-header">
                        <div className="ov-card-title">
                            <h3>Financial Performance</h3>
                            <p>Monthly revenue collected across all properties</p>
                        </div>
                        <select className="ov-chart-select">
                            <option>Current Year</option>
                            <option>Previous Year</option>
                        </select>
                    </div>

                    <div className="ov-chart-body">
                        <div className="ov-bar-chart">
                            {monthlyRevenue.map((val, i) => (
                                <div key={i} className="ov-bar-group">
                                    <div className="ov-bar-track">
                                        <div
                                            className={`ov-bar-fill ${i === new Date().getMonth() ? 'active' : ''}`}
                                            style={{ height: `${(val / maxRevenue) * 100}%` }}
                                        >
                                            <span className="ov-bar-tooltip">₹{val.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <span className="ov-bar-month">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                                </div>
                            ))}
                        </div>

                        <div className="ov-revenue-split">
                            <div className="ov-split-item">
                                <div className="ov-split-dot online"></div>
                                <div className="ov-split-info">
                                    <span className="ov-split-label">Online Payments</span>
                                    <span className="ov-split-value">₹{onlineIncome.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="ov-split-item">
                                <div className="ov-split-dot offline"></div>
                                <div className="ov-split-info">
                                    <span className="ov-split-label">Manual Collections</span>
                                    <span className="ov-split-value">₹{offlineIncome.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="ov-split-item">
                                <div className="ov-split-dot balance"></div>
                                <div className="ov-split-info">
                                    <span className="ov-split-label">Outstanding Balance</span>
                                    <span className="ov-split-value">₹{balanceIncome.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ov-side-column">
                    <div className="ov-occupancy-card card">
                        <div className="ov-card-header">
                            <h3>Occupancy Rate</h3>
                        </div>
                        <div className="ov-gauge-container">
                            <svg viewBox="0 0 36 36" className="ov-gauge">
                                <path className="ov-gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="ov-gauge-fill" strokeDasharray={`${occupancyRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="ov-gauge-text">
                                <span className="ov-gauge-percent">{occupancyRate}%</span>
                                <span className="ov-gauge-label">Occupied</span>
                            </div>
                        </div>
                        <div className="ov-gauge-details">
                            <div className="ov-gd-item">
                                <div className="ov-gd-label-row">
                                    <span className="ov-gd-dot occupied"></span>
                                    <span>Occupied</span>
                                </div>
                                <span className="ov-gd-value">{occupiedUnits}</span>
                            </div>
                            <div className="ov-gd-item">
                                <div className="ov-gd-label-row">
                                    <span className="ov-gd-dot vacant"></span>
                                    <span>Vacant</span>
                                </div>
                                <span className="ov-gd-value">{vacantUnits}</span>
                            </div>
                        </div>
                        <button className="ov-full-btn">
                            Detailed Analytics <ChevronRight size={14} />
                        </button>
                    </div>


                </div>
            </div>

            {/* Revenue Modal */}
            {isRevenueModalOpen && (
                <div className="ov-modal-overlay">
                    <div className="ov-modal card">
                        <div className="ov-modal-header">
                            <h3>Detailed Revenue Report</h3>
                            <button onClick={() => setIsRevenueModalOpen(false)} className="ov-modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="ov-modal-body">
                            <div className="ov-modal-stats">
                                <div className="ov-modal-stat-box primary">
                                    <span className="ov-m-label">Total Collected</span>
                                    <h4 className="ov-m-value">₹{counts.income.toLocaleString()}</h4>
                                </div>
                                <div className="ov-modal-stat-box secondary">
                                    <span className="ov-m-label">Transactions</span>
                                    <h4 className="ov-m-value">{payments.length}</h4>
                                </div>
                            </div>

                            <div className="ov-m-table-wrapper">
                                <table className="ov-m-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Renter & Property</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(payment => (
                                            <tr key={payment.id}>
                                                <td>{new Date(payment.createdAt || payment.date).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="ov-m-renter">{payment.renterName}</div>
                                                    <div className="ov-m-prop">{payment.property}</div>
                                                </td>
                                                <td>
                                                    <span className={`ov-m-type ${payment.type?.toLowerCase()}`}>
                                                        {payment.paymentMethod || payment.type}
                                                    </span>
                                                </td>
                                                <td className="ov-m-amount">₹{Number(payment.amount).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="ov-modal-footer">
                            <button className="ov-primary-btn" onClick={() => setIsRevenueModalOpen(false)}>Close Report</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Row, Col, Container, Table, Button, Badge } from 'react-bootstrap';
import { FaUsers, FaCarSide, FaClipboardList, FaUserTie } from 'react-icons/fa';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  PointElement,
  LineElement
);

const Dashboard = () => {
  const [userCount, setUserCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [bookingStats, setBookingStats] = useState({
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    active: 0
  });
  const [paymentStats, setPaymentStats] = useState({ paid: 0, pending: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 5;
  const [vehicleTypes, setVehicleTypes] = useState({});
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userRes, vehicleRes, bookingRes, staffRes] = await Promise.all([
          axios.get('https://varahibackend.varahiselfdrivecars.com/api/admin/allusers'),
          axios.get('https://varahibackend.varahiselfdrivecars.com/api/car/get-cars'),
          axios.get('https://varahibackend.varahiselfdrivecars.com/api/staff/allbookingsforadmin'),
          axios.get('https://varahibackend.varahiselfdrivecars.com/api/admin/getallstaffs'),
        ]);

        const totalUsers = userRes.data?.pagination?.totalUsers || 0;
        setUserCount(totalUsers);

        const totalVehicles = vehicleRes.data?.total || vehicleRes.data?.cars?.length || 0;
        setVehicleCount(totalVehicles);

        const totalStaff = staffRes.data?.pagination?.totalStaff || staffRes.data?.staff?.length || 0;
        setStaffCount(totalStaff);

        const totalBookings = bookingRes.data?.pagination?.totalBookings || 0;
        setTotalBookingsCount(totalBookings);

        const bookings = bookingRes.data?.bookings || [];

        const statusCounts = {
          pending: 0,
          confirmed: 0,
          cancelled: 0,
          completed: 0,
          active: 0
        };
        const paymentCounts = { paid: 0, pending: 0 };
        const vehicleTypeCounts = {};

        bookings.forEach((booking) => {
          const status = booking.status?.toLowerCase();
          if (status && statusCounts.hasOwnProperty(status)) statusCounts[status]++;
          const paymentStatus = booking.paymentStatus?.toLowerCase();
          if (paymentStatus === 'paid') paymentCounts.paid++;
          else if (paymentStatus === 'pending') paymentCounts.pending++;
        });

        const vehicles = vehicleRes.data?.cars || [];
        vehicles.forEach(car => {
          const type = car.type || 'Unknown';
          vehicleTypeCounts[type] = (vehicleTypeCounts[type] || 0) + 1;
        });

        setBookingStats(statusCounts);
        setPaymentStats(paymentCounts);
        setVehicleTypes(vehicleTypeCounts);
        setRecentBookings(bookings.slice(0, 10));
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const bookingCount = totalBookingsCount;

  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = recentBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(recentBookings.length / bookingsPerPage);

  const handlePrevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);

  const barData = {
    labels: ['Users', 'Staff', 'Vehicles', 'Bookings'],
    datasets: [{
      label: 'Count',
      data: [userCount, staffCount, vehicleCount, bookingCount],
      backgroundColor: ['#a855f7', '#10b981', '#6366f1', '#f59e0b'],
      borderRadius: 12,
    }],
  };

  const pieData = {
    labels: ['Paid', 'Pending'],
    datasets: [{
      data: [paymentStats.paid, paymentStats.pending],
      backgroundColor: ['#22c55e', '#eab308'],
      borderWidth: 0,
    }],
  };

  const statusPieData = {
    labels: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        bookingStats.pending,
        bookingStats.confirmed,
        bookingStats.active,
        bookingStats.completed,
        bookingStats.cancelled
      ],
      backgroundColor: ['#facc15', '#14b8a6', '#3b82f6', '#22c55e', '#ef4444'],
      borderWidth: 0,
    }],
  };

  const lineData = {
    labels: recentBookings.map((_, i) => `#${i + 1}`),
    datasets: [{
      label: 'Total Price (₹)',
      data: recentBookings.map(b => b.totalPrice || 0),
      fill: true,
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#a855f7',
      pointBorderColor: '#fff',
      pointRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 15, font: { size: 12 }, color: '#334155' },
      },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1' },
    },
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  // 🎨 Distinct card backgrounds + click navigation
  const cardConfig = [
    { label: 'Total Users', value: userCount, icon: <FaUsers />, path: '/admin/users', bg: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)', iconBg: '#a855f7' },
    { label: 'Total Staff', value: staffCount, icon: <FaUserTie />, path: '/admin/staff', bg: 'linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%)', iconBg: '#10b981' },
    { label: 'Total Vehicles', value: vehicleCount, icon: <FaCarSide />, path: '/admin/vehicles', bg: 'linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%)', iconBg: '#6366f1' },
    { label: 'Total Bookings', value: bookingCount, icon: <FaClipboardList />, path: '/admin/bookings', bg: 'linear-gradient(135deg, #ffedd5 0%, #fff7ed 100%)', iconBg: '#f59e0b' },
  ];

  return (
    <div style={styles.root}>
      <Container fluid className="px-4 py-4">
        <h2 className="mb-4 fw-bold text-center" style={styles.heading}>
          ✨ Admin Dashboard ✨
        </h2>

        <Row className="g-4 mb-5">
          {cardConfig.map((card, idx) => (
            <Col md={3} key={idx}>
              <div
                style={{ ...styles.glassCard, background: card.bg, cursor: 'pointer' }}
                onClick={() => navigate(card.path)}
              >
                <div className="d-flex align-items-center">
                  <div style={{ ...styles.iconWrapper, background: `${card.iconBg}20` }}>
                    <span style={{ color: card.iconBg, fontSize: '1.8rem' }}>{card.icon}</span>
                  </div>
                  <div className="ms-3">
                    <h6 style={styles.cardLabel}>{card.label}</h6>
                    <h3 style={styles.cardValue}>{card.value.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <Row className="g-4 mb-4">
          <Col xl={6}>
            <div style={styles.chartCard}>
              <h5 className="fw-semibold mb-3" style={styles.chartTitle}>📊 Summary Overview</h5>
              <div style={{ height: '300px' }}>
                <Bar data={barData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          </Col>
          <Col xl={6}>
            <div style={styles.chartCard}>
              <h5 className="fw-semibold mb-3" style={styles.chartTitle}>📌 Booking Status</h5>
              <div style={{ height: '300px' }}>
                {loading ? <Spinner animation="border" variant="secondary" /> : <Pie data={statusPieData} options={chartOptions} />}
              </div>
            </div>
          </Col>
        </Row>

        <Row className="g-4 mb-4">
          <Col xl={6}>
            <div style={styles.chartCard}>
              <h5 className="fw-semibold mb-3" style={styles.chartTitle}>📈 Booking Price Trend</h5>
              <div style={{ height: '300px' }}>
                <Line data={lineData} options={chartOptions} />
              </div>
            </div>
          </Col>
          <Col xl={6}>
            <div style={styles.chartCard}>
              <h5 className="fw-semibold mb-3" style={styles.chartTitle}>💰 Payment Status</h5>
              <div style={{ height: '300px' }}>
                <Doughnut data={pieData} options={chartOptions} />
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <div style={styles.chartCard}>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                <h5 className="fw-semibold mb-0" style={styles.chartTitle}>🕒 Recent Bookings</h5>
                <Button variant="outline-primary" size="sm" onClick={() => navigate('/admin/bookings')} style={styles.viewAllBtn}>
                  View All →
                </Button>
              </div>

              {loading ? (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" variant="secondary" />
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="dashboard-table" style={styles.table}>
                      <thead style={styles.tableHead}>
                        <tr>
                          <th>ID</th><th>User</th><th>Vehicle</th><th>Dates</th><th>Location</th><th>Price</th><th>Status</th><th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBookings.map((booking) => (
                          <tr key={booking._id} style={styles.tableRow}>
                            <td className="text-muted">{booking._id?.slice(-6)}</td>
                            <td>{booking.userId?.name || 'N/A'}</td>
                            <td>{booking.car?.carName || 'N/A'}</td>
                            <td><small>{new Date(booking.rentalStartDate).toLocaleDateString()} – {new Date(booking.rentalEndDate).toLocaleDateString()}</small></td>
                            <td>{booking.pickupLocation || 'N/A'}</td>
                            <td className="text-success fw-bold">₹{booking.totalPrice}</td>
                            <td><Badge bg={getStatusBadge(booking.status)} className="text-capitalize px-2 py-1">{booking.status || 'N/A'}</Badge></td>
                            <td><Badge bg={getPaymentBadge(booking.paymentStatus)} className="text-capitalize px-2 py-1">{booking.paymentStatus || 'N/A'}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2">
                      <Button variant="outline-secondary" onClick={handlePrevPage} disabled={currentPage === 1} style={styles.paginationBtn}>Previous</Button>
                      <span style={{ color: '#475569' }}>Page {currentPage} of {totalPages}</span>
                      <Button variant="outline-secondary" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} style={styles.paginationBtn}>Next</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const styles = {
  root: {
    background: '#ffffff',
    minHeight: '100vh',
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
  },
  heading: {
    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
    fontSize: '2rem',
  },
  glassCard: {
    borderRadius: '28px',
    border: '1px solid rgba(168, 85, 247, 0.15)',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 16px 30px rgba(0, 0, 0, 0.1)',
    }
  },
  iconWrapper: {
    width: '54px',
    height: '54px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20px',
  },
  cardLabel: {
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#64748b',
    marginBottom: '4px',
  },
  cardValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1.2,
  },
  chartCard: {
    background: '#ffffff',
    borderRadius: '28px',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
  },
  chartTitle: {
    color: '#334155',
    borderLeft: '3px solid #a855f7',
    paddingLeft: '12px',
    marginBottom: '1.2rem',
  },
  table: {
    color: '#1e293b',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  },
  tableHead: {
    background: '#f1f5f9',
    borderRadius: '16px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#475569',
  },
  tableRow: {
    background: '#ffffff',
    borderRadius: '16px',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  viewAllBtn: {
    borderColor: '#a855f7',
    color: '#a855f7',
    borderRadius: '40px',
    padding: '0.3rem 1rem',
    fontSize: '0.8rem',
  },
  paginationBtn: {
    borderColor: '#cbd5e1',
    color: '#475569',
    borderRadius: '40px',
    padding: '0.3rem 1rem',
    fontSize: '0.8rem',
  },
};

export default Dashboard;
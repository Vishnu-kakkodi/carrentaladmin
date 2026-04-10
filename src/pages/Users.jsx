import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, Row, Col, Form, Spinner, Alert, Pagination, Image, FormControl, Badge } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);        // NEW: stores all users for search
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    profileImage: '',
    documents: {
      aadharCard: { status: 'pending' },
      drivingLicense: { status: 'pending' }
    }
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedUser, setDetailedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('name');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Pagination state from backend
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  const usersPerPage = 10;

  // Fetch users with pagination
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/admin/allusers?page=${page}&limit=${usersPerPage}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();

      setUsers(data.users);
      setPagination(data.pagination);
      setCurrentPage(data.pagination.currentPage);
      
      // If search is empty, show paginated users
      if (searchTerm === '') {
        setFilteredUsers(data.users);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users once for search (without pagination)
  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/admin/allusers?page=1&limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch all users');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAllUsers();
  }, []);

  // Filter users based on search (using allUsers)
  useEffect(() => {
    if (searchTerm === '') {
      // No search: show paginated users
      setFilteredUsers(users);
      setCurrentPage(pagination.currentPage);
    } else {
      // Search: filter from allUsers (all pages)
      const filtered = allUsers.filter(user => {
        const value = user[filterField] ? user[filterField].toString().toLowerCase() : '';
        return value.includes(searchTerm.toLowerCase());
      });
      setFilteredUsers(filtered);
      setCurrentPage(1);   // reset to first page when searching
    }
  }, [searchTerm, filterField, users, allUsers]);

  const handleShow = async (user = null, index = null) => {
    try {
      setEditingIndex(index);

      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/users/get-user/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch user details');
      const data = await res.json();

      setFormData({
        name: data.user?.name || '',
        email: data.user?.email || '',
        mobile: data.user?.mobile || '',
        profileImage: data.user?.profileImage || '',
        documents: {
          aadharCard: {
            status: data.user?.documents?.aadharCard?.status || 'pending',
            url: data.user?.documents?.aadharCard?.url || ''
          },
          drivingLicense: {
            status: data.user?.documents?.drivingLicense?.status || 'pending',
            url: data.user?.documents?.drivingLicense?.url || ''
          }
        }
      });
      setShow(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDocumentStatusChange = (docType, status) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: {
          ...prev.documents[docType],
          status
        }
      }
    }));
  };

  const handleSave = async () => {
    try {
      if (editingIndex !== null) {
        const userId = users[editingIndex].id;
        const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/admin/updateuser/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            profileImage: formData.profileImage,
            aadharStatus: formData.documents.aadharCard.status,
            licenseStatus: formData.documents.drivingLicense.status
          }),
        });

        if (!res.ok) throw new Error('Failed to update user');

        // Refresh both paginated and all users
        await fetchUsers(currentPage);
        await fetchAllUsers();
        toast.success('User updated successfully!');
      }

      setShow(false);
      setEditingIndex(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (index) => {
    const user = filteredUsers[index];
    const confirmDelete = window.confirm(`Are you sure you want to delete user ${user.name}?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/admin/deleteuser/${user.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete user');

      // Refresh both lists
      await fetchUsers(currentPage);
      await fetchAllUsers();
      toast.success('User deleted successfully!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleViewDetails = async (userId) => {
    try {
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/users/get-user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user details');
      const data = await res.json();
      setDetailedUser(data.user);
      setShowDetailsModal(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortConfig.key) {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  const getDocStatusBadge = (status) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return 'secondary';
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentBadge = (paymentStatus) => {
    if (!paymentStatus) return 'secondary';
    switch (paymentStatus.toLowerCase()) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const renderPagination = () => {
    // Only show pagination when NOT searching
    if (searchTerm !== '') return null;
    
    if (!pagination.totalPages || pagination.totalPages < 1) return null;

    const pages = [];
    const pageSet = new Set();

    pageSet.add(1);

    if (pagination.totalPages > 1) {
      pageSet.add(pagination.totalPages);
    }

    if (pagination.currentPage > 1) pageSet.add(pagination.currentPage - 1);
    pageSet.add(pagination.currentPage);
    if (pagination.currentPage < pagination.totalPages) pageSet.add(pagination.currentPage + 1);

    const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

    let lastPage = 0;
    sortedPages.forEach((page) => {
      if (page - lastPage > 1) {
        pages.push(<Pagination.Ellipsis key={`ellipsis-${page}`} disabled />);
      }

      pages.push(
        <Pagination.Item
          key={page}
          active={page === pagination.currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );

      lastPage = page;
    });

    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.Item
          disabled={!pagination.hasPrevPage}
          onClick={() => pagination.hasPrevPage && handlePageChange(pagination.currentPage - 1)}
        >
          Prev
        </Pagination.Item>
        {pages}
        <Pagination.Item
          disabled={!pagination.hasNextPage}
          onClick={() => pagination.hasNextPage && handlePageChange(pagination.currentPage + 1)}
        >
          Next
        </Pagination.Item>
      </Pagination>
    );
  };

  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  const downloadExcel = async () => {
    try {
      setLoading(true);
      toast.info('Preparing Excel file with detailed user data...', { autoClose: 2000 });

      // Fetch detailed data for all users (using allUsers or fresh fetch)
      const allUsersRes = await fetch('https://varahibackend.varahiselfdrivecars.com/api/admin/allusers?page=1&limit=1000');
      const allUsersData = await allUsersRes.json();
      const allUsersList = allUsersData.users || [];

      const detailedUsers = await Promise.all(
        allUsersList.map(async (user) => {
          try {
            const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/users/get-user/${user.id}`);
            if (!res.ok) throw new Error(`Failed to fetch details for user ${user.id}`);
            const data = await res.json();
            return data.user;
          } catch (error) {
            console.error(error);
            return user;
          }
        })
      );

      const data = detailedUsers.map(user => ({
        'User ID': user.id,
        'Name': user.name || '-',
        'Email': user.email || '-',
        'Mobile': user.mobile || '-',
        'Profile Image': user.profileImage || '-',
        'Registered Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-',
        'Aadhar Status': user.documents?.aadharCard?.status || 'Not uploaded',
        'Aadhar URL': user.documents?.aadharCard?.url || '-',
        'License Status': user.documents?.drivingLicense?.status || 'Not uploaded',
        'License URL': user.documents?.drivingLicense?.url || '-',
        'Total Bookings': user.myBookings?.length || 0,
        'Total Spent': user.myBookings?.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0) || 0,
        'Wallet Balance': user.totalWalletAmount || 0,
        'Last Booking Date': user.myBookings?.length > 0
          ? new Date(Math.max(...user.myBookings.map(b => new Date(b.rentalStartDate || 0))))?.toLocaleDateString()
          : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      const wscols = [
        { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 },
        { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 50 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      ws['!cols'] = wscols;

      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } },
        alignment: { horizontal: "center" }
      };

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = headerStyle;
      }

      XLSX.writeFile(wb, "detailed_users_report.xlsx");
      toast.success('Excel file downloaded successfully!', { autoClose: 2000 });

    } catch (err) {
      console.error('Error generating Excel:', err);
      toast.error('Failed to generate Excel file', { autoClose: 2000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Users Management</h2>
        <Badge bg="info" className="p-2">
          Showing {filteredUsers.length} of {searchTerm ? allUsers.length : pagination.totalUsers} users | Page {currentPage} of {searchTerm ? 1 : pagination.totalPages}
        </Badge>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Form.Select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
          >
            <option value="name">Search by Name</option>
            <option value="email">Search by Email</option>
            <option value="mobile">Search by Mobile</option>
            <option value="id">Search by ID</option>
          </Form.Select>
        </Col>
        <Col md={6}>
          <FormControl
            type="text"
            placeholder={`Search by ${filterField}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={3} className="text-end">
          <Button
            variant="success"
            onClick={downloadExcel}
            className="ms-2"
          >
            <i className="fas fa-file-excel me-2"></i>Export to Excel
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          <div className='table-responsive'>
            <Table striped bordered hover responsive>
              <thead>
                <tr className='table-header'>
                  <th>S.NO</th>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Actions</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length > 0 ? (
                  sortedUsers.map((u, i) => (
                    <tr key={u.id}>
                      <td className="text-center">{((currentPage - 1) * usersPerPage) + i + 1}</td>
                      <td>
                        <Image
                          src={u.profileImage ? u.profileImage : "/profile.png"}
                          alt="profile"
                          roundedCircle
                          width="40"
                          height="40"
                        />
                      </td>
                      <td>{u.name || '-'}</td>
                      <td>{u.mobile || '-'}</td>
                      <td>{u.email || '-'}</td>
                      <td className="text-center align-middle">
                        <button
                          onClick={() => handleShow(u, users.findIndex(user => user.id === u.id))}
                          className="me-1 mb-1 mt-1 ms-1 btn btn-sm btn-outline-warning"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(sortedUsers.findIndex(user => user.id === u.id))}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                      <td className="text-center align-middle">
                        <button
                          className="me-2 btn btn-sm btn-outline-info text-center"
                          onClick={() => handleViewDetails(u.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">No users found</td>
                  </tr>
                )}
              </tbody>
            </Table>
            {renderPagination()}
            
            {/* Pagination Info */}
            <div className="text-center text-muted mt-2">
              <small>
                Showing {sortedUsers.length} of {searchTerm ? allUsers.length : pagination.totalUsers} users | 
                Page {currentPage} of {searchTerm ? 1 : pagination.totalPages}
              </small>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      <Modal show={show} onHide={() => setShow(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mobile</Form.Label>
                  <Form.Control
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Profile Image URL</Form.Label>
                  <Form.Control
                    value={formData.profileImage}
                    onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />

            <h5>Document Status</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Aadhar Card Status</Form.Label>
                  <Form.Select
                    value={formData.documents.aadharCard.status}
                    onChange={(e) => handleDocumentStatusChange('aadharCard', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Driving License Status</Form.Label>
                  <Form.Select
                    value={formData.documents.drivingLicense.status}
                    onChange={(e) => handleDocumentStatusChange('drivingLicense', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className='text-primary'>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailedUser ? (
            <>
              <Row className="mb-3">
                <Col md={4} className="text-center">
                  <Image
                    src={detailedUser.profileImage || "/profile.png"}
                    alt="Profile"
                    fluid
                    style={{
                      width: "250px",
                      height: "250px",
                      objectFit: "cover",
                      borderRadius: "50%",
                      border: "2px solid #ccc"
                    }}
                  />
                </Col>
                <Col md={8}>
                  <p><strong>User ID: </strong> {detailedUser.id}</p>
                  <p><strong>Name: </strong>{detailedUser.name}</p>
                  <p><strong>Email:</strong> {detailedUser.email}</p>
                  <p><strong>Mobile:</strong> {detailedUser.mobile}</p>
                  <p><strong>Created At:</strong> {new Date(detailedUser.createdAt).toLocaleString()}</p>
                  <p><strong>Updated At:</strong> {new Date(detailedUser.updatedAt).toLocaleString()}</p>
                </Col>
              </Row>

              <hr />

              <h4 className='text-primary'>Documents</h4>
              <Row className="mb-4">
                <Col md={6} className="d-flex flex-column align-items-center text-center">
                  <p><strong>Aadhar Card:</strong></p>
                  {detailedUser.documents?.aadharCard?.url ? (
                    <>
                      <Image
                        src={detailedUser.documents.aadharCard.url}
                        style={{ maxWidth: "200px", height: "auto", marginBottom: "10px" }}
                        fluid
                        thumbnail
                      />
                      <p>Status:
                        <span className={`badge bg-${getDocStatusBadge(detailedUser.documents.aadharCard.status)} ms-2`}>
                          {detailedUser.documents.aadharCard.status}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p>Not uploaded</p>
                  )}
                </Col>

                <Col md={6} className="d-flex flex-column align-items-center text-center">
                  <p><strong>Driving License:</strong></p>
                  {detailedUser.documents?.drivingLicense?.url ? (
                    <>
                      <Image
                        src={detailedUser.documents.drivingLicense.url}
                        style={{ maxWidth: "200px", height: "auto", marginBottom: "10px" }}
                        fluid
                        thumbnail
                      />
                      <p>Status:
                        <span className={`badge bg-${getDocStatusBadge(detailedUser.documents.drivingLicense.status)} ms-2`}>
                          {detailedUser.documents.drivingLicense.status}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p>Not uploaded</p>
                  )}
                </Col>
              </Row>

              <hr />

              <h4 className='text-primary'>Bookings ({detailedUser.myBookings?.length || 0})</h4>
              <div className="table-responsive mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table table-sm table-striped table-bordered">
                  <thead>
                    <tr className='table-header'>
                      <th>Car ID</th>
                      <th>Date</th>
                      <th>Deposit</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Price</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedUser.myBookings?.length > 0 ? (
                      detailedUser.myBookings.map((booking, idx) => (
                        <tr key={idx}>
                          <td>{booking.carId?.slice(-6)}</td>
                          <td>{booking.rentalStartDate}</td>
                          <td>{booking.deposit}</td>
                          <td>{booking.from}</td>
                          <td>{booking.to}</td>
                          <td>₹{booking.totalPrice}</td>
                          <td>
                            <span className={`badge bg-${getPaymentBadge(booking.paymentStatus)} text-white`}>
                              {booking.paymentStatus || "Unknown"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getStatusBadge(booking.status)} text-white`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">No bookings found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <hr />

              <h4 className='text-primary'>Wallet Transactions (Total: ₹{detailedUser.totalWalletAmount || 0})</h4>
              <ul className="list-group mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {detailedUser.wallet?.length > 0 ? (
                  detailedUser.wallet.map((entry) => (
                    <li key={entry._id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-bold">{entry.type?.toUpperCase()}</span>: {entry.message}
                        <div className="text-muted small">{new Date(entry.date).toLocaleString()}</div>
                      </div>
                      <span className="badge bg-primary rounded-pill">₹{entry.amount}</span>
                    </li>
                  ))
                ) : (
                  <li className="list-group-item text-center">No wallet transactions</li>
                )}
              </ul>
            </>
          ) : (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Users;
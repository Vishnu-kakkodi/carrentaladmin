import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Table, Spinner, Alert, Pagination, Nav, Tab, Row, Col, Badge } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const OwnerVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState('active');
  const [formData, setFormData] = useState({
    carName: '',
    model: '',
    year: '',
    pricePerHour: '',
    pricePerDay: '',
    extendedPrice: { perHour: '', perDay: '' },
    fuel: '',
    seats: '',
    type: '',
    location: '',
    carType: '',
    carImage: [],
    carDocs: [],
    status: 'active',
    availabilityStatus: true,
    description: '',
    vehicleNumber: '',
    delayPerHour: '',
    delayPerDay: '',
    branchName: '',
    branchLat: '',
    branchLng: '',
    runningStatus: 'Available',
    isPremium: false,
    depositOptions: [],
    availability: [],
    ownerCommision: '',   // ← added
  });
  const [searchType, setSearchType] = useState('carName');
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const itemsPerPage = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const [showCustomCarTypeInput, setShowCustomCarTypeInput] = useState(false);
  const [showCustomFuelInput, setShowCustomFuelInput] = useState(false);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [availabilityRows, setAvailabilityRows] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Predefined options for dropdowns
  const transmissionTypes = ['Automatic', 'Manual'];
  const carTypes = ['SUV', 'SEDAN', 'HATCHBACK'];
  const fuelTypes = ['Petrol', 'Diesel'];
  const depositOptionTypes = ['Bike', 'Cash', 'Laptop'];

  // Status options for navigation
  const statusOptions = [
    { value: 'all', label: 'All Vehicles', variant: 'secondary' },
    { value: 'active', label: 'Active', variant: 'success' },
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://varahibackend.varahiselfdrivecars.com/api/car/owner-cars');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      const carList = data.cars || [];
      const reversed = carList.reverse();
      setVehicles(reversed);
      setFilteredVehicles(reversed);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = vehicles;

    if (activeStatusTab !== 'all') {
      filtered = filtered.filter(v => v.status === activeStatusTab);
    }

    if (showPremiumOnly) {
      filtered = filtered.filter(v => v.isPremium === true);
    }

    if (searchText.trim() !== '') {
      filtered = filtered.filter((v) => {
        let value = '';
        switch (searchType) {
          case 'carName':
          case 'model':
          case 'location':
          case 'status':
          case 'vehicleNumber':
          case 'runningStatus':
          case 'type':
          case 'carType':
          case 'fuel':
            value = v[searchType] || '';
            break;
          case 'ownerName':
            value = v.ownerId?.fullName || '';
            break;
          case 'ownerEmail':
            value = v.ownerId?.email || '';
            break;
          case 'isPremium':
            if (searchText.toLowerCase() === 'premium' || searchText.toLowerCase() === 'yes' || searchText === 'true') {
              return v.isPremium === true;
            } else if (searchText.toLowerCase() === 'standard' || searchText.toLowerCase() === 'no' || searchText === 'false') {
              return v.isPremium === false;
            }
            value = v.isPremium ? 'premium' : 'standard';
            return value.includes(searchText.toLowerCase());
          case 'branchName':
            value = v.branch?.name || '';
            break;
          default:
            value = '';
        }
        return value.toString().toLowerCase().includes(searchText.toLowerCase());
      });
    }

    setFilteredVehicles(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    filterVehicles();
  }, [searchText, searchType, vehicles, showPremiumOnly, activeStatusTab]);

  const updateCarStatus = async (carId, newStatus) => {
    setUpdatingStatus(carId);
    try {
      const response = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/car/update-car-status/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle =>
          vehicle._id === carId ? { ...vehicle, status: newStatus } : vehicle
        )
      );
      toast.success(`Vehicle status updated to ${newStatus} successfully!`);
    } catch (error) {
      toast.error('Failed to update vehicle status: ' + error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    const availabilityData = vehicle.availability || [];
    setAvailabilityRows(availabilityData.map(avail => ({
      date: avail.date || '',
      timeSlots: avail.timeSlots?.join(', ') || ''
    })));
    setFormData({
      carName: vehicle.carName || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      pricePerHour: vehicle.pricePerHour || '',
      pricePerDay: vehicle.pricePerDay || '',
      extendedPrice: vehicle.extendedPrice || { perHour: '', perDay: '' },
      fuel: vehicle.fuel || '',
      seats: vehicle.seats || '',
      type: vehicle.type || '',
      location: vehicle.location || '',
      carType: vehicle.carType || '',
      carImage: vehicle.carImage || [],
      carDocs: vehicle.carDocs || [],
      status: vehicle.status || 'active',
      availabilityStatus: vehicle.availabilityStatus !== false,
      description: vehicle.description || '',
      vehicleNumber: vehicle.vehicleNumber || '',
      delayPerHour: vehicle.delayPerHour || '',
      delayPerDay: vehicle.delayPerDay || '',
      branchName: vehicle.branch?.name || '',
      branchLat: vehicle.branch?.location?.coordinates?.[1] || '',
      branchLng: vehicle.branch?.location?.coordinates?.[0] || '',
      runningStatus: vehicle.runningStatus || 'Available',
      isPremium: vehicle.isPremium || false,
      depositOptions: vehicle.depositOptions || [],
      availability: vehicle.availability || [],
      ownerCommision: vehicle.ownerCommision ?? '',   // ← pre-fill from vehicle
    });
    setShowCustomTypeInput(!transmissionTypes.includes(vehicle.type));
    setShowCustomCarTypeInput(!carTypes.includes(vehicle.carType));
    setShowCustomFuelInput(!fuelTypes.includes(vehicle.fuel));
    setFiles([]);
    setDocFiles([]);
    setShowModal(true);
  };

  const openViewModal = (vehicle) => {
    setViewVehicle(vehicle);
    setShowViewModal(true);
  };

  const closeModal = () => setShowModal(false);
  const closeViewModal = () => setShowViewModal(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleExtendedPriceChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      extendedPrice: { ...prev.extendedPrice, [name]: value }
    }));
  };

  const handleDepositOptionsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, depositOptions: selectedOptions }));
  };

  const handleFileChange = (e) => setFiles([...e.target.files]);
  const handleDocFileChange = (e) => setDocFiles([...e.target.files]);

  const handleAddAvailabilityRow = () => {
    setAvailabilityRows([...availabilityRows, { date: '', timeSlots: '' }]);
  };

  const handleRemoveAvailabilityRow = (index) => {
    setAvailabilityRows(availabilityRows.filter((_, i) => i !== index));
  };

  const handleAvailabilityChange = (index, field, value) => {
    const newRows = [...availabilityRows];
    newRows[index][field] = value;
    setAvailabilityRows(newRows);
  };

  const handleTypeChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomTypeInput(true);
      setFormData(prev => ({ ...prev, type: '' }));
    } else {
      setShowCustomTypeInput(false);
      setFormData(prev => ({ ...prev, type: value }));
    }
  };

  const handleCarTypeChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomCarTypeInput(true);
      setFormData(prev => ({ ...prev, carType: '' }));
    } else {
      setShowCustomCarTypeInput(false);
      setFormData(prev => ({ ...prev, carType: value }));
    }
  };

  const handleFuelChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomFuelInput(true);
      setFormData(prev => ({ ...prev, fuel: '' }));
    } else {
      setShowCustomFuelInput(false);
      setFormData(prev => ({ ...prev, fuel: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const processedAvailability = availabilityRows
      .filter(row => row.date && row.timeSlots)
      .map(row => ({
        date: row.date,
        timeSlots: row.timeSlots.split(',').map(slot => slot.trim())
      }));

    const formDataToSend = new FormData();

    Object.keys(formData).forEach(key => {
      if (key === 'extendedPrice') {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'branch') {
        const branchData = {
          name: formData.branchName,
          location: {
            type: "Point",
            coordinates: [
              parseFloat(formData.branchLng) || 0,
              parseFloat(formData.branchLat) || 0
            ]
          }
        };
        formDataToSend.append(key, JSON.stringify(branchData));
      } else if (key === 'depositOptions') {
        formDataToSend.append(key, JSON.stringify(formData[key]));
      } else if (key === 'availability') {
        formDataToSend.append(key, JSON.stringify(processedAvailability));
      } else if (key !== 'carImage' && key !== 'carDocs' && key !== 'branchName' && key !== 'branchLat' && key !== 'branchLng') {
        if (key === 'isPremium') {
          formDataToSend.append(key, formData[key].toString());
        } else {
          formDataToSend.append(key, formData[key]);
        }
      }
    });

    formDataToSend.append('branchName', formData.branchName);
    formDataToSend.append('branchLat', formData.branchLat);
    formDataToSend.append('branchLng', formData.branchLng);

    files.forEach(file => formDataToSend.append('carImage', file));
    docFiles.forEach(file => formDataToSend.append('carDocs', file));

    try {
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/car/updatecar/${editingVehicle._id}`, {
        method: 'PUT',
        body: formDataToSend,
      });
      if (!res.ok) throw new Error('Failed to update vehicle');
      await fetchVehicles();
      toast.success('Car updated successfully!');
      setShowModal(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/car/deletecar/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete vehicle');
        setVehicles((prev) => prev.filter((v) => v._id !== id));
        toast.success('Car deleted successfully!');
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleDownload = () => {
    try {
      toast.info('Preparing Excel file with vehicle data...', { autoClose: 2000 });
      const wsData = vehicles.map(v => ({
        ID: v._id,
        Name: v.carName || '-',
        Model: v.model || '-',
        Year: v.year || '-',
        PricePerHour: v.pricePerHour || '-',
        PricePerDay: v.pricePerDay || '-',
        ExtendedPricePerHour: v.extendedPrice?.perHour || '-',
        ExtendedPricePerDay: v.extendedPrice?.perDay || '-',
        OwnerCommision: v.ownerCommision ?? '-',   // ← included in export
        Status: v.status || 'active',
        RunningStatus: v.runningStatus || 'Available',
        AvailabilityStatus: v.availabilityStatus !== false ? 'Available' : 'Not Available',
        Fuel: v.fuel || '-',
        Seats: v.seats || '-',
        Type: v.type || '-',
        Location: v.location || '-',
        CarType: v.carType || '-',
        Description: v.description || '-',
        VehicleNumber: v.vehicleNumber || '-',
        DelayPerHour: v.delayPerHour || '-',
        DelayPerDay: v.delayPerDay || '-',
        BranchName: v.branch?.name || '-',
        BranchLocation: v.branch?.location ? `${v.branch.location.coordinates[1]}, ${v.branch.location.coordinates[0]}` : '-',
        IsPremium: v.isPremium ? 'Yes' : 'No',
        OwnerName: v.ownerId?.fullName || '-',
        OwnerEmail: v.ownerId?.email || '-',
        DepositOptions: v.depositOptions?.join(', ') || '-',
        Availability: v.availability?.map(a => `${a.date} (${a.timeSlots?.join(', ')})`).join('; ') || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "OwnerVehicles");
      ws['!cols'] = Array(28).fill({ wch: 20 });
      XLSX.writeFile(wb, "OwnerVehicles_Report.xlsx");
      toast.success('Excel file downloaded successfully!', { autoClose: 2000 });
    } catch (error) {
      toast.error('Failed to download vehicle data.', { autoClose: 2000 });
    }
  };

  const handleRefresh = async () => {
    await fetchVehicles();
    toast.success('Data refreshed successfully!');
  };

  const togglePremiumFilter = () => setShowPremiumOnly(!showPremiumOnly);

  const getStatusCount = (status) => {
    if (status === 'all') return vehicles.length;
    return vehicles.filter(v => v.status === status).length;
  };

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderPagination = () => {
    if (!totalPages || totalPages < 1) return null;
    const pages = [];
    const pageSet = new Set();
    pageSet.add(1);
    if (totalPages > 1) pageSet.add(totalPages);
    if (currentPage > 1) pageSet.add(currentPage - 1);
    pageSet.add(currentPage);
    if (currentPage < totalPages) pageSet.add(currentPage + 1);
    const sortedPages = Array.from(pageSet).sort((a, b) => a - b);
    let lastPage = 0;
    sortedPages.forEach((page) => {
      if (page - lastPage > 1) pages.push(<Pagination.Ellipsis key={`ellipsis-${page}`} disabled />);
      pages.push(
        <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
          {page}
        </Pagination.Item>
      );
      lastPage = page;
    });
    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} disabled={currentPage === 1} />
        {pages}
        <Pagination.Next onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  return (
    <div className="container-fluid p-3">
      <ToastContainer position="top-right" autoClose={2000} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Owner Vehicles Management</h2>
        <div>
          <Button variant="info" className="me-2" onClick={handleRefresh}>
            <i className="fas fa-sync-alt me-2"></i>Refresh
          </Button>
          <Button variant="success" onClick={handleDownload} disabled={vehicles.length === 0}>
            <i className="fas fa-file-excel me-2"></i>Export
          </Button>
        </div>
      </div>

      {/* Status Navigation Tabs */}
      <div className="mb-4">
        <Nav variant="tabs" activeKey={activeStatusTab} onSelect={(selectedKey) => setActiveStatusTab(selectedKey)}>
          {statusOptions.map(option => (
            <Nav.Item key={option.value}>
              <Nav.Link eventKey={option.value}>
                <Badge bg={option.variant} className="me-2">{getStatusCount(option.value)}</Badge>
                {option.label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Search and Filter Row */}
      <div className="row mb-3">
        <div className="col-md-3">
          <Form.Select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
            <option value="carName">Search by Car Name</option>
            <option value="model">Search by Model</option>
            <option value="location">Search by Location</option>
            <option value="status">Search by Status</option>
            <option value="vehicleNumber">Search by Vehicle Number</option>
            <option value="runningStatus">Search by Running Status</option>
            <option value="branchName">Search by Branch Name</option>
            <option value="type">Search by Transmission Type</option>
            <option value="carType">Search by Car Type</option>
            <option value="fuel">Search by Fuel Type</option>
            <option value="ownerName">Search by Owner Name</option>
            <option value="ownerEmail">Search by Owner Email</option>
            <option value="isPremium">Search by Premium Status</option>
          </Form.Select>
        </div>
        <div className="col-md-4">
          <Form.Control
            type="text"
            placeholder={`Search by ${searchType.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="col-md-5">
          <div className="d-flex justify-content-end">
            <Button
              variant={showPremiumOnly ? "warning" : "outline-warning"}
              className="me-2"
              onClick={togglePremiumFilter}
            >
              <i className="fas fa-crown me-2"></i>
              {showPremiumOnly ? "Show All Cars" : "Premium Cars Only"}
            </Button>
            <Button variant="secondary" onClick={() => { setSearchText(''); setSearchType('carName'); setShowPremiumOnly(false); }}>
              <i className="fas fa-times me-2"></i>Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-4"><i className="fas fa-car fa-4x text-muted"></i></div>
          <h4 className="text-muted mb-3">No Owner Vehicles Found</h4>
          <p className="text-muted mb-4">No vehicles have been added by owners yet.</p>
        </div>
      ) : (
        <>
          {showPremiumOnly && (
            <Alert variant="warning" className="mb-3">
              <i className="fas fa-crown me-2"></i>
              Showing only premium vehicles ({filteredVehicles.length} found)
            </Alert>
          )}

          <div className="table-responsive">
            <Table bordered hover striped>
              <thead>
                <tr className='table-header'>
                  <th>S.NO</th>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Model</th>
                  <th>Year</th>
                  <th>Price/Hr</th>
                  <th>Price/Day</th>
                  <th>Commission %</th>
                  <th>Status</th>
                  <th>Premium</th>
                  <th>Fuel</th>
                  <th>Seats</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Car Type</th>
                  <th>Branch</th>
                  <th>Veh. Number</th>
                  <th>Owner Name</th>
                  <th>Owner Email</th>
                  <th>Deposits</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="22" className="text-center">No vehicles match your search criteria.</td>
                  </tr>
                ) : (
                  paginatedVehicles.map((vehicle, index) => (
                    <tr key={vehicle._id}>
                      <td className="text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{vehicle._id.slice(-6)}</td>
                      <td>
                        {vehicle.carImage?.[0] ? (
                          <img
                            src={vehicle.carImage[0]}
                            alt={vehicle.carName}
                            style={{ width: '80px', height: '50px', objectFit: 'cover' }}
                          />
                        ) : 'No Image'}
                      </td>
                      <td>{vehicle.carName}</td>
                      <td>{vehicle.model}</td>
                      <td>{vehicle.year}</td>
                      <td>₹{vehicle?.pricePerHour || 'N/A'}</td>
                      <td>₹{vehicle?.pricePerDay || 'N/A'}</td>
                      {/* ── Owner Commission column ── */}
                      <td className="text-center">
                        {vehicle.ownerCommision != null && vehicle.ownerCommision !== ''
                          ? <Badge bg="info">{vehicle.ownerCommision}%</Badge>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={vehicle.status}
                          onChange={(e) => updateCarStatus(vehicle._id, e.target.value)}
                          disabled={updatingStatus === vehicle._id}
                          style={{ width: '130px' }}
                          className={`border-${vehicle.status === 'active' ? 'success' :
                            vehicle.status === 'onHold' ? 'warning' :
                            vehicle.status === 'underRepair' ? 'danger' : 'info'}`}
                        >
                          <option value="active">Active</option>
                          <option value="onHold">On Hold</option>
                          <option value="underRepair">Under Repair</option>
                          <option value="pending">Pending</option>
                        </Form.Select>
                        {updatingStatus === vehicle._id && (
                          <Spinner animation="border" size="sm" className="ms-2" />
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${vehicle.isPremium ? 'warning' : 'secondary'}`}>
                          {vehicle.isPremium ? 'Premium' : 'Standard'}
                        </span>
                      </td>
                      <td>{vehicle.fuel}</td>
                      <td>{vehicle.seats}</td>
                      <td>{vehicle.type}</td>
                      <td>{vehicle.location}</td>
                      <td>{vehicle.carType}</td>
                      <td>{vehicle.branch?.name || '-'}</td>
                      <td>{vehicle.vehicleNumber || '-'}</td>
                      <td>{vehicle.ownerId?.fullName || '-'}</td>
                      <td>{vehicle.ownerId?.email || '-'}</td>
                      <td>
                        {vehicle.depositOptions?.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {vehicle.depositOptions.map((opt, idx) => (
                              <Badge key={idx} bg="info" className="me-1">{opt}</Badge>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center align-middle">
                        <button className="me-1 mb-1 mt-1 ms-1 btn btn-sm btn-outline-info" onClick={() => openViewModal(vehicle)}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="me-1 mb-1 mt-1 ms-1 btn btn-sm btn-outline-warning" onClick={() => openEditModal(vehicle)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(vehicle._id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          <div className="d-flex justify-content-center">{renderPagination()}</div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Edit / Create Modal
      ───────────────────────────────────────────────────────────── */}
      <Modal show={showModal} onHide={closeModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Edit Vehicle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row">

              {/* ── Basic Information ── */}
              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Car Name *</Form.Label>
                <Form.Control type="text" name="carName" value={formData.carName} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Model *</Form.Label>
                <Form.Control type="text" name="model" value={formData.model} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Year *</Form.Label>
                <Form.Control type="number" name="year" value={formData.year} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Vehicle Number *</Form.Label>
                <Form.Control type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Location *</Form.Label>
                <Form.Control type="text" name="location" value={formData.location} onChange={handleChange} required />
              </Form.Group>

              {/* ── Pricing Information ── */}
              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Price Per Hour *</Form.Label>
                <Form.Control type="number" name="pricePerHour" value={formData.pricePerHour} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Price Per Day *</Form.Label>
                <Form.Control type="number" name="pricePerDay" value={formData.pricePerDay} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Extended Price Per Hour</Form.Label>
                <Form.Control type="number" name="perHour" value={formData.extendedPrice.perHour} onChange={handleExtendedPriceChange} />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Extended Price Per Day</Form.Label>
                <Form.Control type="number" name="perDay" value={formData.extendedPrice.perDay} onChange={handleExtendedPriceChange} />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Delay Per Hour</Form.Label>
                <Form.Control type="number" name="delayPerHour" value={formData.delayPerHour} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Delay Per Day</Form.Label>
                <Form.Control type="number" name="delayPerDay" value={formData.delayPerDay} onChange={handleChange} />
              </Form.Group>

              {/* ── Owner Commission (NEW) ── */}
              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Owner Commission (%)</Form.Label>
                <div className="input-group">
                  <Form.Control
                    type="number"
                    name="ownerCommision"
                    value={formData.ownerCommision}
                    onChange={handleChange}
                    placeholder="e.g. 15"
                    min="0"
                    max="100"
                  />
                  <span className="input-group-text">%</span>
                </div>
                <Form.Text className="text-muted">Percentage commission paid to the vehicle owner.</Form.Text>
              </Form.Group>

              {/* ── Vehicle Specifications ── */}
              <Form.Group className="mb-3 col-md-3">
                <Form.Label>Seats *</Form.Label>
                <Form.Control type="number" name="seats" value={formData.seats} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-3">
                <Form.Label>Transmission Type *</Form.Label>
                {showCustomTypeInput ? (
                  <Form.Control type="text" name="type" value={formData.type} onChange={handleChange} required />
                ) : (
                  <Form.Select name="type" value={formData.type} onChange={handleTypeChange} required>
                    <option value="">Select Transmission</option>
                    {transmissionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-3">
                <Form.Label>Car Type *</Form.Label>
                {showCustomCarTypeInput ? (
                  <Form.Control type="text" name="carType" value={formData.carType} onChange={handleChange} required />
                ) : (
                  <Form.Select name="carType" value={formData.carType} onChange={handleCarTypeChange} required>
                    <option value="">Select Car Type</option>
                    {carTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-3">
                <Form.Label>Fuel Type *</Form.Label>
                {showCustomFuelInput ? (
                  <Form.Control type="text" name="fuel" value={formData.fuel} onChange={handleChange} required />
                ) : (
                  <Form.Select name="fuel" value={formData.fuel} onChange={handleFuelChange} required>
                    <option value="">Select Fuel Type</option>
                    {fuelTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              {/* ── Status Information ── */}
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={formData.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="onHold">On Hold</option>
                  <option value="underRepair">Under Repair</option>
                  <option value="pending">Pending</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Running Status</Form.Label>
                <Form.Select name="runningStatus" value={formData.runningStatus} onChange={handleChange}>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Availability Status</Form.Label>
                <div className="mt-2">
                  <Form.Check
                    type="switch"
                    id="availabilityStatus"
                    name="availabilityStatus"
                    label={formData.availabilityStatus ? "Available" : "Not Available"}
                    checked={formData.availabilityStatus}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Premium Vehicle</Form.Label>
                <div className="mt-2">
                  <Form.Check
                    type="switch"
                    id="isPremium"
                    name="isPremium"
                    label={formData.isPremium ? "Premium Vehicle" : "Standard Vehicle"}
                    checked={formData.isPremium}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>

              {/* ── Branch Information ── */}
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Branch Name</Form.Label>
                <Form.Control type="text" name="branchName" value={formData.branchName} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Branch Latitude</Form.Label>
                <Form.Control type="number" step="any" name="branchLat" value={formData.branchLat} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Branch Longitude</Form.Label>
                <Form.Control type="number" step="any" name="branchLng" value={formData.branchLng} onChange={handleChange} />
              </Form.Group>

              {/* ── Deposit Options ── */}
              <Form.Group className="mb-3 col-12">
                <Form.Label>Deposit Options</Form.Label>
                <Form.Select multiple value={formData.depositOptions} onChange={handleDepositOptionsChange} style={{ height: '100px' }}>
                  {depositOptionTypes.map(option => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
                <small className="text-muted">Hold Ctrl/Cmd to select multiple options</small>
              </Form.Group>

              {/* ── Availability Schedule ── */}
              <div className="col-12 mb-3">
                <Form.Label className="fw-bold">Availability Schedule</Form.Label>
                <Button variant="outline-primary" size="sm" onClick={handleAddAvailabilityRow} className="mb-2 ms-2">
                  <i className="fas fa-plus me-1"></i> Add Availability
                </Button>
                {availabilityRows.map((row, index) => (
                  <div key={index} className="row mb-2 align-items-end">
                    <div className="col-md-4">
                      <Form.Control
                        type="date"
                        value={row.date}
                        onChange={(e) => handleAvailabilityChange(index, 'date', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <Form.Control
                        type="text"
                        placeholder="Time Slots (comma separated, e.g., 09:00, 18:00)"
                        value={row.timeSlots}
                        onChange={(e) => handleAvailabilityChange(index, 'timeSlots', e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <Button variant="outline-danger" size="sm" onClick={() => handleRemoveAvailabilityRow(index)}>
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Description ── */}
              <Form.Group className="mb-3 col-12">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} />
              </Form.Group>

              {/* ── Files ── */}
              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Car Images</Form.Label>
                <Form.Control type="file" multiple onChange={handleFileChange} accept="image/*" />
                {editingVehicle && formData.carImage?.length > 0 && (
                  <div className="mt-2">
                    <small>Current Images: {formData.carImage.length} image(s)</small>
                    <div className="d-flex flex-wrap mt-1">
                      {formData.carImage.slice(0, 3).map((img, idx) => (
                        <img key={idx} src={img} alt={`Current ${idx}`} style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '5px' }} />
                      ))}
                      {formData.carImage.length > 3 && <span>+{formData.carImage.length - 3} more</span>}
                    </div>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Car Documents</Form.Label>
                <Form.Control type="file" multiple onChange={handleDocFileChange} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                {editingVehicle && formData.carDocs?.length > 0 && (
                  <div className="mt-2">
                    <small>Current Documents: {formData.carDocs.length} document(s)</small>
                  </div>
                )}
              </Form.Group>

            </div>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={closeModal} className="me-2">Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Updating...</span>
                  </>
                ) : 'Update Vehicle'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          View Vehicle Modal
      ───────────────────────────────────────────────────────────── */}
      <Modal show={showViewModal} onHide={closeViewModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Vehicle Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewVehicle ? (
            <div className="row">
              {/* Basic Information */}
              <div className="col-md-6">
                <h5 className="text-primary mb-3">Basic Information</h5>
                <div className="mb-2"><strong>Car Name:</strong> {viewVehicle.carName || '-'}</div>
                <div className="mb-2"><strong>Model:</strong> {viewVehicle.model || '-'}</div>
                <div className="mb-2"><strong>Year:</strong> {viewVehicle.year || '-'}</div>
                <div className="mb-2"><strong>Vehicle Number:</strong> {viewVehicle.vehicleNumber || '-'}</div>
                <div className="mb-2"><strong>Location:</strong> {viewVehicle.location || '-'}</div>
                <div className="mb-2"><strong>Description:</strong> {viewVehicle.description || '-'}</div>
              </div>

              {/* Pricing Information */}
              <div className="col-md-6">
                <h5 className="text-primary mb-3">Pricing Information</h5>
                <div className="mb-2"><strong>Price Per Hour:</strong> ₹{viewVehicle.pricePerHour || 'N/A'}</div>
                <div className="mb-2"><strong>Price Per Day:</strong> ₹{viewVehicle.pricePerDay || 'N/A'}</div>
                <div className="mb-2"><strong>Extended Price/Hour:</strong> ₹{viewVehicle.extendedPrice?.perHour || 'N/A'}</div>
                <div className="mb-2"><strong>Extended Price/Day:</strong> ₹{viewVehicle.extendedPrice?.perDay || 'N/A'}</div>
                <div className="mb-2"><strong>Delay Per Hour:</strong> ₹{viewVehicle.delayPerHour || 'N/A'}</div>
                <div className="mb-2"><strong>Delay Per Day:</strong> ₹{viewVehicle.delayPerDay || 'N/A'}</div>
                {/* ── Owner Commission in view modal ── */}
                <div className="mb-2">
                  <strong>Owner Commission:</strong>{' '}
                  {viewVehicle.ownerCommision != null && viewVehicle.ownerCommision !== ''
                    ? <Badge bg="info">{viewVehicle.ownerCommision}%</Badge>
                    : <span className="text-muted">—</span>
                  }
                </div>
              </div>

              {/* Specifications */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Specifications</h5>
                <div className="mb-2"><strong>Seats:</strong> {viewVehicle.seats || '-'}</div>
                <div className="mb-2"><strong>Transmission:</strong> {viewVehicle.type || '-'}</div>
                <div className="mb-2"><strong>Car Type:</strong> {viewVehicle.carType || '-'}</div>
                <div className="mb-2"><strong>Fuel Type:</strong> {viewVehicle.fuel || '-'}</div>
              </div>

              {/* Status Information */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Status Information</h5>
                <div className="mb-2">
                  <strong>Status:</strong>{' '}
                  <span className={`badge bg-${viewVehicle.status === 'active' ? 'success' :
                    viewVehicle.status === 'onHold' ? 'warning' :
                    viewVehicle.status === 'underRepair' ? 'danger' : 'info'}`}>
                    {viewVehicle.status || 'active'}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Running Status:</strong>{' '}
                  <span className={`badge bg-${viewVehicle.runningStatus === 'Available' ? 'success' : 'danger'}`}>
                    {viewVehicle.runningStatus || 'Available'}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Availability Status:</strong>{' '}
                  <span className={`badge bg-${viewVehicle.availabilityStatus ? 'success' : 'danger'}`}>
                    {viewVehicle.availabilityStatus ? 'Available' : 'Not Available'}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Premium Status:</strong>{' '}
                  <span className={`badge bg-${viewVehicle.isPremium ? 'warning' : 'secondary'}`}>
                    {viewVehicle.isPremium ? 'Premium Vehicle' : 'Standard Vehicle'}
                  </span>
                </div>
              </div>

              {/* Owner Information */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Owner Information</h5>
                <div className="mb-2"><strong>Owner Name:</strong> {viewVehicle.ownerId?.fullName || '-'}</div>
                <div className="mb-2"><strong>Owner Email:</strong> {viewVehicle.ownerId?.email || '-'}</div>
              </div>

              {/* Branch Information */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Branch Information</h5>
                <div className="mb-2"><strong>Branch Name:</strong> {viewVehicle.branch?.name || '-'}</div>
                <div className="mb-2">
                  <strong>Location:</strong>{' '}
                  {viewVehicle.branch?.location?.coordinates
                    ? `${viewVehicle.branch.location.coordinates[1]}, ${viewVehicle.branch.location.coordinates[0]}`
                    : '-'}
                </div>
              </div>

              {/* Deposit Options */}
              <div className="col-12 mt-3">
                <h5 className="text-primary mb-3">Deposit Options</h5>
                {viewVehicle.depositOptions?.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {viewVehicle.depositOptions.map((option, index) => (
                      <span key={index} className="badge bg-info">{option}</span>
                    ))}
                  </div>
                ) : <p>No deposit options available</p>}
              </div>

              {/* Availability Schedule */}
              <div className="col-12 mt-3">
                <h5 className="text-primary mb-3">Availability Schedule</h5>
                {viewVehicle.availability?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr><th>Date</th><th>Time Slots</th></tr>
                      </thead>
                      <tbody>
                        {viewVehicle.availability.map((avail, index) => (
                          <tr key={index}>
                            <td>{avail.date || '-'}</td>
                            <td>{avail.timeSlots?.join(', ') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p>No availability information</p>}
              </div>

              {/* Images */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Car Images</h5>
                {viewVehicle.carImage?.length > 0 ? (
                  <div className="d-flex flex-wrap">
                    {viewVehicle.carImage.map((img, index) => (
                      <img key={index} src={img} alt={`Car ${index}`}
                        style={{ width: '120px', height: '80px', objectFit: 'cover', marginRight: '8px', marginBottom: '8px' }} />
                    ))}
                  </div>
                ) : <p>No images available</p>}
              </div>

              {/* Documents */}
              <div className="col-md-6 mt-3">
                <h5 className="text-primary mb-3">Car Documents</h5>
                {viewVehicle.carDocs?.length > 0 ? (
                  <div className="d-flex flex-wrap">
                    {viewVehicle.carDocs.map((doc, index) => (
                      <a key={index} href={doc} target="_blank" rel="noopener noreferrer" className="me-3 mb-2">
                        <i className="fas fa-file-alt fa-2x text-info"></i>
                        <span className="ms-2">Document {index + 1}</span>
                      </a>
                    ))}
                  </div>
                ) : <p>No documents available</p>}
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeViewModal}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OwnerVehicles;
import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Table, Spinner, Alert, Pagination, InputGroup, FormControl } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBookingViewModal, setShowBookingViewModal] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [viewBooking, setViewBooking] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
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
    isPremium: false
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
  const [isExportingBookings, setIsExportingBookings] = useState(false);
  
  // Date filter states
  const [rentalStartDateFilter, setRentalStartDateFilter] = useState('');
  const [rentalEndDateFilter, setRentalEndDateFilter] = useState('');
  const [bookingCreatedDateFilter, setBookingCreatedDateFilter] = useState('');

  // Predefined options for dropdowns
  const transmissionTypes = ['Automatic', 'Manual'];
  const carTypes = ['SUV', 'SEDAN', 'HATCHBACK'];
  const fuelTypes = ['Petrol', 'Diesel'];

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch('https://varahibackend.varahiselfdrivecars.com/api/car/get-cars');
        if (!res.ok) throw new Error('Failed to fetch vehicles');
        const data = await res.json();
        const carList = data.cars || [];

        // Reverse order (newest first)
        const reversed = (data.cars || []).reverse();

        setVehicles(reversed);
        setFilteredVehicles(reversed);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const filterVehicles = () => {
    let filtered = vehicles;

    // Apply premium filter if enabled
    if (showPremiumOnly) {
      filtered = filtered.filter(v => v.isPremium === true);
    }

    // Apply search filter if there's search text
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
  }, [searchText, searchType, vehicles, showPremiumOnly]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
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
      isPremium: false
    });
    setFiles([]);
    setDocFiles([]);
    setShowCustomTypeInput(false);
    setShowCustomCarTypeInput(false);
    setShowCustomFuelInput(false);
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      carName: vehicle.carName,
      model: vehicle.model,
      year: vehicle.year,
      pricePerHour: vehicle.pricePerHour,
      pricePerDay: vehicle.pricePerDay,
      extendedPrice: vehicle.extendedPrice || { perHour: '', perDay: '' },
      fuel: vehicle.fuel,
      seats: vehicle.seats,
      type: vehicle.type,
      location: vehicle.location,
      carType: vehicle.carType,
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
      isPremium: vehicle.isPremium || false
    });

    setShowCustomTypeInput(!transmissionTypes.includes(vehicle.type));
    setShowCustomCarTypeInput(!carTypes.includes(vehicle.carType));
    setShowCustomFuelInput(!fuelTypes.includes(vehicle.fuel));

    setFiles([]);
    setDocFiles([]);
    setShowModal(true);
  };

  const openViewModal = async (id) => {
    try {
      const res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/car/getcar/${id}`);
      if (!res.ok) throw new Error('Failed to fetch vehicle details');
      const data = await res.json();
      setViewVehicle(data);
      setShowViewModal(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openBookingViewModal = (booking) => {
    setViewBooking(booking);
    setShowBookingViewModal(true);
  };

  const closeModal = () => setShowModal(false);
  const closeViewModal = () => setShowViewModal(false);
  const closeBookingViewModal = () => setShowBookingViewModal(false);

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
      extendedPrice: {
        ...prev.extendedPrice,
        [name]: value
      }
    }));
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleDocFileChange = (e) => {
    setDocFiles([...e.target.files]);
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
              parseFloat(formData.branchLng),
              parseFloat(formData.branchLat)
            ]
          }
        };
        formDataToSend.append(key, JSON.stringify(branchData));
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

    files.forEach(file => {
      formDataToSend.append('carImage', file);
    });

    docFiles.forEach(file => {
      formDataToSend.append('carDocs', file);
    });

    try {
      let res, result;
      if (editingVehicle) {
        res = await fetch(`https://varahibackend.varahiselfdrivecars.com/api/car/updatecar/${editingVehicle._id}`, {
          method: 'PUT',
          body: formDataToSend,
        });
        if (!res.ok) throw new Error('Failed to update vehicle');
        result = await res.json();
        setVehicles(prev =>
          prev.map(v => (v._id === editingVehicle._id ? result.car : v))
        );
        toast.success('Car updated successfully!');
      } else {
        res = await fetch('https://varahibackend.varahiselfdrivecars.com/api/car/add-cars', {
          method: 'POST',
          body: formDataToSend,
        });
        if (!res.ok) throw new Error('Failed to add vehicle');
        result = await res.json();
        setVehicles(prev => [...prev, result.car]);
        toast.success('Car added successfully!');
      }
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
        Images: (v.carImage || []).join(', ') || '-',
        Documents: (v.carDocs || []).join(', ') || '-',
        IsPremium: v.isPremium ? 'Yes' : 'No',
        TotalBookings: v.bookedStatus?.length || 0
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vehicles");

      ws['!cols'] = [
        { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
        { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 30 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 25 }, { wch: 40 }, { wch: 40 }, { wch: 10 },
        { wch: 20 }, { wch: 15 }
      ];

      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } },
        alignment: { horizontal: "center" }
      };
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[cellAddress]) {
          ws[cellAddress].s = headerStyle;
        }
      }

      XLSX.writeFile(wb, "Vehicles_Report.xlsx");
      toast.success('Excel file downloaded successfully!', { autoClose: 2000 });
    } catch (error) {
      console.error('Error generating vehicle Excel:', error);
      toast.error('Failed to download vehicle data.', { autoClose: 2000 });
    }
  };

  const handleExportCarBookings = () => {
    if (!viewVehicle || !viewVehicle.bookings || viewVehicle.bookings.length === 0) {
      toast.warning('No bookings to export for this vehicle!');
      return;
    }

    // Apply date filters to bookings
    let filteredBookings = [...viewVehicle.bookings];

    // Filter by Rental Start Date
    if (rentalStartDateFilter) {
      filteredBookings = filteredBookings.filter(booking => {
        const bookingStartDate = booking.rentalStartDate ? new Date(booking.rentalStartDate).toISOString().split('T')[0] : '';
        return bookingStartDate === rentalStartDateFilter;
      });
    }

    // Filter by Rental End Date
    if (rentalEndDateFilter) {
      filteredBookings = filteredBookings.filter(booking => {
        const bookingEndDate = booking.rentalEndDate ? new Date(booking.rentalEndDate).toISOString().split('T')[0] : '';
        return bookingEndDate === rentalEndDateFilter;
      });
    }

    // Filter by Booking Created Date
    if (bookingCreatedDateFilter) {
      filteredBookings = filteredBookings.filter(booking => {
        const bookingCreatedDate = booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : '';
        return bookingCreatedDate === bookingCreatedDateFilter;
      });
    }

    if (filteredBookings.length === 0) {
      toast.warning('No bookings match the selected date filters!');
      return;
    }

    setIsExportingBookings(true);
    try {
      toast.info(`Preparing Excel file with ${filteredBookings.length} filtered bookings...`, { autoClose: 1500 });

      const wsData = filteredBookings.map((booking, index) => ({
        'S.No': index + 1,
        'Booking ID': booking._id || '-',
        'User Name': booking.userId?.name || '-',
        'User Email': booking.userId?.email || '-',
        'User Mobile': booking.userId?.mobile || '-',
        'Rental Start Date': booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : '-',
        'Rental End Date': booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : '-',
        'From Time': booking.from || '-',
        'To Time': booking.to || '-',
        'Total Price': booking.totalPrice || 0,
        'Status': booking.status || '-',
        'Payment Status': booking.paymentStatus || '-',
        'Transaction ID': booking.transactionId || '-',
        'OTP': booking.otp || '-',
        'Return OTP': booking.returnOTP || '-',
        'Deposit Type': booking.deposit || '-',
        'Booking Created Date': booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-',
        'Booking Created Time': booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : '-',
        'Has Return Details': booking.returnDetails?.length > 0 ? 'Yes' : 'No',
        'Has Replacement History': booking.carReplacementHistory?.length > 0 ? 'Yes' : 'No',
        'Deposit PDF': booking.depositPDF || '-',
        'Final Booking PDF': booking.finalBookingPDF || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      
      const carName = viewVehicle.car?.carName?.replace(/\s+/g, '_') || viewVehicle.carName?.replace(/\s+/g, '_') || 'Vehicle';
      
      // Add filter info to filename
      let fileName = `${carName}_Bookings`;
      if (rentalStartDateFilter) fileName += `_start_${rentalStartDateFilter}`;
      if (rentalEndDateFilter) fileName += `_end_${rentalEndDateFilter}`;
      if (bookingCreatedDateFilter) fileName += `_created_${bookingCreatedDateFilter}`;
      fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");

      const wscols = [
        { wch: 6 },   // S.No
        { wch: 25 },  // Booking ID
        { wch: 20 },  // User Name
        { wch: 25 },  // User Email
        { wch: 15 },  // User Mobile
        { wch: 15 },  // Rental Start Date
        { wch: 15 },  // Rental End Date
        { wch: 10 },  // From Time
        { wch: 10 },  // To Time
        { wch: 12 },  // Total Price
        { wch: 15 },  // Status
        { wch: 15 },  // Payment Status
        { wch: 20 },  // Transaction ID
        { wch: 10 },  // OTP
        { wch: 12 },  // Return OTP
        { wch: 15 },  // Deposit Type
        { wch: 18 },  // Booking Created Date
        { wch: 18 },  // Booking Created Time
        { wch: 18 },  // Has Return Details
        { wch: 20 },  // Has Replacement History
        { wch: 30 },  // Deposit PDF
        { wch: 30 }   // Final Booking PDF
      ];
      ws['!cols'] = wscols;

      XLSX.writeFile(wb, fileName);
      toast.success(`${filteredBookings.length} filtered bookings exported successfully!`, { autoClose: 2000 });
    } catch (error) {
      console.error('Error exporting bookings:', error);
      toast.error('Failed to export bookings: ' + error.message);
    } finally {
      setIsExportingBookings(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://varahibackend.varahiselfdrivecars.com/api/car/get-cars');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      const reversed = (data.cars || []).reverse();
      setVehicles(reversed);
      setFilteredVehicles(reversed);
      setCurrentPage(1);
      toast.success('Data refreshed successfully!');
    } catch (err) {
      toast.error('Failed to refresh: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilters = () => {
    setRentalStartDateFilter('');
    setRentalEndDateFilter('');
    setBookingCreatedDateFilter('');
  };

  const togglePremiumFilter = () => {
    setShowPremiumOnly(!showPremiumOnly);
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
    if (totalPages > 1) {
      pageSet.add(totalPages);
    }
    if (currentPage > 1) pageSet.add(currentPage - 1);
    pageSet.add(currentPage);
    if (currentPage < totalPages) pageSet.add(currentPage + 1);

    const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

    let lastPage = 0;
    sortedPages.forEach((page) => {
      if (page - lastPage > 1) {
        pages.push(<Pagination.Ellipsis key={`ellipsis-${page}`} disabled />);
      }

      pages.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </Pagination.Item>
      );

      lastPage = page;
    });

    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.Item
          disabled={currentPage === 1}
          onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
        >
          Prev
        </Pagination.Item>
        {pages}
        <Pagination.Item
          disabled={currentPage === totalPages}
          onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
        >
          Next
        </Pagination.Item>
      </Pagination>
    );
  };

  return (
    <div className="container-fluid p-3">
      <ToastContainer position="top-right" autoClose={2000} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Vehicles Management</h2>
        <div>
          <Button
            variant="primary"
            onClick={openAddModal}
          >
            Add Vehicle
          </Button>
        </div>
      </div>      

      {/* Main Filters Row */}
      <div className="row mb-3">
        <div className="col-md-3">
          <Form.Select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
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
            <option value="isPremium">Search by Premium Status</option>
          </Form.Select>
        </div>
        <div className="col-md-4">
          <div className="d-flex justify-content-end">
            <Button 
              variant={showPremiumOnly ? "warning" : "outline-warning"} 
              className="me-2"
              onClick={togglePremiumFilter}
            >
              <i className="fas fa-crown me-2"></i>
              {showPremiumOnly ? "Show All Cars" : "Premium Cars Only"}
            </Button>
            <Button variant="info" className="me-2" onClick={handleRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh
            </Button>
            <Button
              variant="success"
              onClick={handleDownload}
              disabled={vehicles.length === 0}
            >
              <i className="fas fa-file-excel me-2"></i>Export
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
          <div className="mb-4">
            <i className="fas fa-car fa-4x text-muted"></i>
          </div>
          <h4 className="text-muted mb-3">No Vehicles Found</h4>
          <p className="text-muted mb-4">Get started by adding your first vehicle to the system.</p>
          <Button variant="primary" size="lg" onClick={openAddModal}>
            <i className="fas fa-plus me-2"></i>Add Your First Vehicle
          </Button>
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
                  <th>Ext. Price/Hr</th>
                  <th>Ext. Price/Day</th>
                  <th>Status</th>
                  <th>Bookings</th>
                  <th>Premium</th>
                  <th>Fuel</th>
                  <th>Seats</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Car Type</th>
                  <th>Branch</th>
                  <th>Veh. Number</th>
                  <th>Delay/Hr</th>
                  <th>Delay/Day</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="25" className="text-center">No vehicles match your search criteria.</td>
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
                      <td>₹{vehicle.pricePerHour}</td>
                      <td>₹{vehicle.pricePerDay}</td>
                      <td>₹{vehicle.extendedPrice?.perHour || '-'}</td>
                      <td>₹{vehicle.extendedPrice?.perDay || '-'}</td>
                      <td>
                        <span className={`badge bg-${vehicle.status === 'active' ? 'success' : 'warning'}`}>
                          {vehicle.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge bg-${vehicle.bookedStatus?.length > 0 ? "danger" : "info"}`}
                        >
                          {vehicle.bookedStatus?.length || 0}
                        </span>
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
                      <td>₹{vehicle.delayPerHour || '-'}</td>
                      <td>₹{vehicle.delayPerDay || '-'}</td>
                      <td className="text-center align-middle">
                        <button
                          className="me-1 mb-1 mt-1 ms-1 btn btn-sm btn-outline-info"
                          onClick={() => openViewModal(vehicle._id)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className="me-1 mb-1 mt-1 ms-1 btn btn-sm btn-outline-warning"
                          onClick={() => openEditModal(vehicle)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(vehicle._id)}
                        >
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

      {/* Add/Edit Modal (unchanged) */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              {['carName', 'model', 'year', 'pricePerHour', 'pricePerDay',
                'seats', 'location', 'vehicleNumber', 'delayPerHour', 'delayPerDay',
                'branchName', 'branchLat', 'branchLng'].map((field) => (
                  <Form.Group key={field} className="mb-3 col-md-4">
                    <Form.Label>
                      {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    </Form.Label>
                    <Form.Control
                      type={['year', 'pricePerHour', 'pricePerDay', 'seats',
                        'delayPerHour', 'delayPerDay', 'branchLat', 'branchLng'].includes(field)
                        ? 'number' : 'text'}
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      required={!['pricePerDay', 'delayPerHour', 'delayPerDay',
                        'branchLat', 'branchLng'].includes(field)}
                    />
                  </Form.Group>
                ))}

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Transmission Type</Form.Label>
                {showCustomTypeInput ? (
                  <Form.Control
                    type="text"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <Form.Select
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    required
                  >
                    <option value="">Select Transmission</option>
                    {transmissionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Car Type</Form.Label>
                {showCustomCarTypeInput ? (
                  <Form.Control
                    type="text"
                    name="carType"
                    value={formData.carType}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <Form.Select
                    name="carType"
                    value={formData.carType}
                    onChange={handleCarTypeChange}
                    required
                  >
                    <option value="">Select Car Type</option>
                    {carTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Fuel Type</Form.Label>
                {showCustomFuelInput ? (
                  <Form.Control
                    type="text"
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <Form.Select
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleFuelChange}
                    required
                  >
                    <option value="">Select Fuel Type</option>
                    {fuelTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Extended Price Per Hour</Form.Label>
                <Form.Control
                  type="number"
                  name="perHour"
                  value={formData.extendedPrice.perHour}
                  onChange={handleExtendedPriceChange}
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Extended Price Per Day</Form.Label>
                <Form.Control
                  type="number"
                  name="perDay"
                  value={formData.extendedPrice.perDay}
                  onChange={handleExtendedPriceChange}
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="onHold">On Hold</option>
                  <option value="underRepair">Under Repair</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Running Status</Form.Label>
                <Form.Select
                  name="runningStatus"
                  value={formData.runningStatus}
                  onChange={handleChange}
                >
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                </Form.Select>
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

              <Form.Group className="mb-3 col-12">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Car Images</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*"
                />
                {editingVehicle && formData.carImage?.length > 0 && (
                  <div className="mt-2">
                    <small>Current Images: {formData.carImage.join(', ')}</small>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-6">
                <Form.Label>Car Documents</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleDocFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                {editingVehicle && formData.carDocs?.length > 0 && (
                  <div className="mt-2">
                    <small>Current Documents: {formData.carDocs.join(', ')}</small>
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
                    <span className="ms-2">Submitting...</span>
                  </>
                ) : editingVehicle ? 'Update' : 'Add'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Vehicle Modal - Added Owner Info */}
      <Modal show={showViewModal} onHide={closeViewModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Vehicle Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewVehicle ? (
            <div className="row">
              {/* Left Column */}
              <div className="col-md-6">
                <h4 className="mb-3">
                  {viewVehicle.car?.carName || viewVehicle.carName} - {viewVehicle.car?.model || viewVehicle.model}
                </h4>
                <div className="mb-3">
                  <strong>Year:</strong> {viewVehicle.car?.year || viewVehicle.year || '-'}
                </div>
                <div className="mb-3">
                  <strong>Vehicle Number:</strong> {viewVehicle.car?.vehicleNumber || viewVehicle.vehicleNumber || '-'}
                </div>
                <div className="mb-3">
                  <strong>Location:</strong> {viewVehicle.car?.location || viewVehicle.location || '-'}
                </div>
                <div className="mb-3">
                  <strong>Branch:</strong> {viewVehicle.car?.branch?.name || viewVehicle.branch?.name || '-'}
                </div>
                <div className="mb-3">
                  <strong>Branch Coordinates:</strong>{' '}
                  {viewVehicle.car?.branch?.location?.coordinates ? 
                    `${viewVehicle.car.branch.location.coordinates[1]}, ${viewVehicle.car.branch.location.coordinates[0]}` : 
                    viewVehicle.branch?.location?.coordinates ? 
                    `${viewVehicle.branch.location.coordinates[1]}, ${viewVehicle.branch.location.coordinates[0]}` : '-'}
                </div>
                <div className="mb-3">
                  <strong>Transmission:</strong> {viewVehicle.car?.type || viewVehicle.type || '-'}
                </div>
                <div className="mb-3">
                  <strong>Car Type:</strong> {viewVehicle.car?.carType || viewVehicle.carType || '-'}
                </div>
                <div className="mb-3">
                  <strong>Fuel:</strong> {viewVehicle.car?.fuel || viewVehicle.fuel || '-'}
                </div>
                <div className="mb-3">
                  <strong>Seats:</strong> {viewVehicle.car?.seats || viewVehicle.seats || '-'}
                </div>
                <div className="mb-3">
                  <strong>Premium Status:</strong>
                  <span className={`badge bg-${(viewVehicle.car?.isPremium || viewVehicle.isPremium) ? 'warning' : 'secondary'} ms-2`}>
                    {(viewVehicle.car?.isPremium || viewVehicle.isPremium) ? 'Premium Vehicle' : 'Standard Vehicle'}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-md-6">
                <div className="mb-3">
                  <strong>Price Per Hour:</strong> ₹{viewVehicle.car?.pricePerHour || viewVehicle.pricePerHour || '-'}
                </div>
                <div className="mb-3">
                  <strong>Price Per Day:</strong> ₹{viewVehicle.car?.pricePerDay || viewVehicle.pricePerDay || '-'}
                </div>
                <div className="mb-3">
                  <strong>Extended Price Per Hour:</strong> ₹{viewVehicle.car?.extendedPrice?.perHour || viewVehicle.extendedPrice?.perHour || '-'}
                </div>
                <div className="mb-3">
                  <strong>Extended Price Per Day:</strong> ₹{viewVehicle.car?.extendedPrice?.perDay || viewVehicle.extendedPrice?.perDay || '-'}
                </div>
                <div className="mb-3">
                  <strong>Delay Per Hour:</strong> ₹{viewVehicle.car?.delayPerHour || viewVehicle.delayPerHour || '-'}
                </div>
                <div className="mb-3">
                  <strong>Delay Per Day:</strong> ₹{viewVehicle.car?.delayPerDay || viewVehicle.delayPerDay || '-'}
                </div>
                <div className="mb-3">
                  <strong>Status:</strong>
                  <span className={`badge bg-${(viewVehicle.car?.status || viewVehicle.status) === 'active' ? 'success' : 'warning'} ms-2`}>
                    {viewVehicle.car?.status || viewVehicle.status || 'active'}
                  </span>
                </div>
                <div className="mb-3">
                  <strong>Running Status:</strong>
                  <span className={`badge bg-${(viewVehicle.car?.runningStatus || viewVehicle.runningStatus) === 'Available' ? 'success' : 'danger'} ms-2`}>
                    {viewVehicle.car?.runningStatus || viewVehicle.runningStatus || 'Available'}
                  </span>
                </div>
                <div className="mb-3">
                  <strong>Total Bookings:</strong>
                  <span className="badge bg-info ms-2">{viewVehicle.bookings?.length || 0}</span>
                </div>
                <div className="mb-3">
                  <strong>Total Revenue:</strong>
                  <span className="badge bg-success ms-2 fs-6">₹{viewVehicle.totalRevenue || 0}</span>
                </div>
              </div>

              {/* Description */}
              <div className="col-12">
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p>{viewVehicle.car?.description || viewVehicle.description || '-'}</p>
                </div>
              </div>

              {/* Car Images */}
              <div className="col-md-6">
                <h5>Car Images</h5>
                {viewVehicle.car?.carImage?.length > 0 || viewVehicle.carImage?.length > 0 ? (
                  <div className="d-flex flex-wrap">
                    {(viewVehicle.car?.carImage || viewVehicle.carImage || []).map((img, index) => (
                      <div key={index} className="me-2 mb-2">
                        <img
                          src={img}
                          alt={`Car Image ${index}`}
                          style={{ width: '150px', height: '100px', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No images available</p>
                )}
              </div>

              {/* Car Documents */}
              <div className="col-md-6">
                <h5>Car Documents</h5>
                {viewVehicle.car?.carDocs?.length > 0 || viewVehicle.carDocs?.length > 0 ? (
                  <div className="d-flex flex-wrap">
                    {(viewVehicle.car?.carDocs || viewVehicle.carDocs || []).map((doc, index) => (
                      <div key={index} className="me-2 mb-2">
                        <img
                          src={doc}
                          alt={`Car Document ${index}`}
                          style={{ width: '150px', height: '100px', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No documents available</p>
                )}
              </div>

              {/* Booked Status Table */}
              <div className="col-12 mt-4">
                <h5 className="mb-3">Booked Status</h5>
                {viewVehicle.car?.bookedStatus?.length > 0 || viewVehicle.bookedStatus?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle shadow-sm rounded">
                      <thead className="table-header">
                        <tr>
                          <th style={{ width: "70px" }} className="text-center">SNO</th>
                          <th>Booking Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewVehicle.car?.bookedStatus || viewVehicle.bookedStatus || []).map((status, index) => (
                          <tr key={index}>
                            <td className="text-center fw-bold">{index + 1}</td>
                            <td>
                              <span className="badge bg-light text-dark p-2 shadow-sm">
                                {status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info mb-0">No bookings yet</div>
                )}
              </div>

              {/* Detailed Bookings History (unchanged) */}
              <div className="col-12 mt-4">
                {/* ... Detailed Bookings Table ... (same as original) */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                  <div className="d-flex align-items-center flex-wrap">
                    <h5 className="mb-0 me-3">Detailed Bookings History</h5>
                    {viewVehicle.bookings && viewVehicle.bookings.length > 0 && (
                      <span className="badge bg-primary rounded-pill fs-6 px-3 py-2 me-3">
                        Total: {viewVehicle.bookings.length}
                      </span>
                    )}
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <div className="d-flex flex-column">
                        <Form.Label className="small fw-bold mb-1">Rental Start Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={rentalStartDateFilter}
                          onChange={(e) => setRentalStartDateFilter(e.target.value)}
                          style={{ width: '150px' }}
                          size="sm"
                        />
                      </div>
                      <div className="d-flex flex-column">
                        <Form.Label className="small fw-bold mb-1">Rental End Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={rentalEndDateFilter}
                          onChange={(e) => setRentalEndDateFilter(e.target.value)}
                          style={{ width: '150px' }}
                          size="sm"
                        />
                      </div>
                      <div className="d-flex flex-column">
                        <Form.Label className="small fw-bold mb-1">Booking Created Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={bookingCreatedDateFilter}
                          onChange={(e) => setBookingCreatedDateFilter(e.target.value)}
                          style={{ width: '150px' }}
                          size="sm"
                        />
                      </div>
                      {(rentalStartDateFilter || rentalEndDateFilter || bookingCreatedDateFilter) && (
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={clearDateFilters}
                          title="Clear Filters"
                          className="mt-3"
                        >
                          <i className="fas fa-times me-1"></i>Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {viewVehicle.bookings && viewVehicle.bookings.length > 0 && (
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleExportCarBookings}
                      disabled={isExportingBookings}
                      className="ms-2"
                    >
                      {isExportingBookings ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                          <span className="ms-2">Exporting...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-file-excel me-2"></i>
                          Export to Excel
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {(rentalStartDateFilter || rentalEndDateFilter || bookingCreatedDateFilter) && (
                  <div className="alert alert-info mb-3 py-2">
                    <i className="fas fa-filter me-2"></i>
                    <strong>Active Filters:</strong>
                    {rentalStartDateFilter && <span className="ms-2 badge bg-primary">Rental Start: {rentalStartDateFilter}</span>}
                    {rentalEndDateFilter && <span className="ms-2 badge bg-primary">Rental End: {rentalEndDateFilter}</span>}
                    {bookingCreatedDateFilter && <span className="ms-2 badge bg-primary">Created: {bookingCreatedDateFilter}</span>}
                  </div>
                )}
                {viewVehicle.bookings && viewVehicle.bookings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>S.No</th>
                          <th>Booking ID</th>
                          <th>User Name</th>
                          <th>User Mobile</th>
                          <th>Rental Start</th>
                          <th>Rental End</th>
                          <th>Booking Created Date</th>
                          <th>Total Price</th>
                          <th>Status</th>
                          <th>Payment Status</th>
                          <th>OTP</th>
                          <th>Return OTP</th>
                          <th>Transaction ID</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewVehicle.bookings.map((booking, index) => {
                          const bookingStartDate = booking.rentalStartDate ? new Date(booking.rentalStartDate).toISOString().split('T')[0] : '';
                          const bookingEndDate = booking.rentalEndDate ? new Date(booking.rentalEndDate).toISOString().split('T')[0] : '';
                          const bookingCreatedDate = booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : '';
                          
                          const matchesStartDate = !rentalStartDateFilter || bookingStartDate === rentalStartDateFilter;
                          const matchesEndDate = !rentalEndDateFilter || bookingEndDate === rentalEndDateFilter;
                          const matchesCreatedDate = !bookingCreatedDateFilter || bookingCreatedDate === bookingCreatedDateFilter;
                          
                          if (!matchesStartDate || !matchesEndDate || !matchesCreatedDate) {
                            return null;
                          }
                          
                          return (
                            <tr key={booking._id || index}>
                              <td>{index + 1}</td>
                              <td><small>{booking._id?.slice(-8) || '-'}</small></td>
                              <td>
                                {booking.userId?.name || '-'}
                                <br/><small className="text-muted">{booking.userId?.email || ''}</small>
                              </td>
                              <td>{booking.userId?.mobile || '-'}</td>
                              <td>
                                {booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : '-'}
                                <br/><small>{booking.from || ''}</small>
                              </td>
                              <td>
                                {booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : '-'}
                                <br/><small>{booking.to || ''}</small>
                              </td>
                              <td>
                                {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-'}
                                <br/><small>{booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : ''}</small>
                              </td>
                              <td>₹{booking.totalPrice || 0}</td>
                              <td>
                                <span className={`badge bg-${
                                  booking.status === 'completed' ? 'success' : 
                                  booking.status === 'cancelled' ? 'danger' : 
                                  booking.status === 'active' ? 'primary' : 
                                  booking.status === 'pending' ? 'warning' : 'secondary'
                                }`}>
                                  {booking.status || '-'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge bg-${
                                  booking.paymentStatus?.toLowerCase() === 'paid' ? 'success' : 'warning'
                                }`}>
                                  {booking.paymentStatus || '-'}
                                </span>
                              </td>
                              <td>{booking.otp || '-'}</td>
                              <td>{booking.returnOTP || '-'}</td>
                              <td><small>{booking.transactionId?.slice(-10) || '-'}</small></td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => openBookingViewModal(booking)}
                                  title="View Booking Details"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        }).filter(Boolean)}
                      </tbody>
                    </table>
                    {(() => {
                      const filteredCount = viewVehicle.bookings.filter(booking => {
                        const startDate = booking.rentalStartDate ? new Date(booking.rentalStartDate).toISOString().split('T')[0] : '';
                        const endDate = booking.rentalEndDate ? new Date(booking.rentalEndDate).toISOString().split('T')[0] : '';
                        const createdDate = booking.createdAt ? new Date(booking.createdAt).toISOString().split('T')[0] : '';
                        return (!rentalStartDateFilter || startDate === rentalStartDateFilter) &&
                               (!rentalEndDateFilter || endDate === rentalEndDateFilter) &&
                               (!bookingCreatedDateFilter || createdDate === bookingCreatedDateFilter);
                      }).length;
                      if (filteredCount < viewVehicle.bookings.length) {
                        return (
                          <div className="text-muted mt-2">
                            Showing {filteredCount} of {viewVehicle.bookings.length} bookings
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <div className="alert alert-info">No detailed booking history available for this vehicle.</div>
                )}
              </div>
            </div>
          ) : (
            <Spinner animation="border" variant="primary" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeViewModal}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* View Booking Modal (unchanged) */}
      <Modal show={showBookingViewModal} onHide={closeBookingViewModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Booking Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewBooking ? (
            <div className="row">
              <div className="col-md-6">
                <h5 className="text-primary mb-3">User Information</h5>
                <div className="mb-2"><strong>Name:</strong> {viewBooking.userId?.name || '-'}</div>
                <div className="mb-2"><strong>Email:</strong> {viewBooking.userId?.email || '-'}</div>
                <div className="mb-2"><strong>Mobile:</strong> {viewBooking.userId?.mobile || '-'}</div>
              </div>
              <div className="col-md-6">
                <h5 className="text-primary mb-3">Booking Information</h5>
                <div className="mb-2"><strong>Booking ID:</strong> {viewBooking._id || '-'}</div>
                <div className="mb-2"><strong>Transaction ID:</strong> {viewBooking.transactionId || '-'}</div>
                <div className="mb-2"><strong>Deposit Type:</strong> {viewBooking.deposit || '-'}</div>
                <div className="mb-2"><strong>Created At:</strong> {viewBooking.createdAt ? new Date(viewBooking.createdAt).toLocaleString() : '-'}</div>
                <div className="mb-2"><strong>Updated At:</strong> {viewBooking.updatedAt ? new Date(viewBooking.updatedAt).toLocaleString() : '-'}</div>
              </div>
              <div className="col-12 mt-3">
                <h5 className="text-primary mb-3">Rental Details</h5>
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-2"><strong>Start Date:</strong> {viewBooking.rentalStartDate ? new Date(viewBooking.rentalStartDate).toLocaleDateString() : '-'}</div>
                    <div className="mb-2"><strong>Start Time:</strong> {viewBooking.from || '-'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-2"><strong>End Date:</strong> {viewBooking.rentalEndDate ? new Date(viewBooking.rentalEndDate).toLocaleDateString() : '-'}</div>
                    <div className="mb-2"><strong>End Time:</strong> {viewBooking.to || '-'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-2"><strong>Total Price:</strong> ₹{viewBooking.totalPrice || 0}</div>
                  </div>
                </div>
              </div>
              <div className="col-12 mt-3">
                <h5 className="text-primary mb-3">Status Information</h5>
                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-2">
                      <strong>Status:</strong>{' '}
                      <span className={`badge bg-${
                        viewBooking.status === 'completed' ? 'success' : 
                        viewBooking.status === 'cancelled' ? 'danger' : 
                        viewBooking.status === 'active' ? 'primary' : 
                        viewBooking.status === 'pending' ? 'warning' : 'secondary'
                      }`}>
                        {viewBooking.status || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <strong>Payment:</strong>{' '}
                      <span className={`badge bg-${
                        viewBooking.paymentStatus?.toLowerCase() === 'paid' ? 'success' : 'warning'
                      }`}>
                        {viewBooking.paymentStatus || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2"><strong>OTP:</strong> {viewBooking.otp || '-'}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2"><strong>Return OTP:</strong> {viewBooking.returnOTP || '-'}</div>
                  </div>
                </div>
              </div>
              {(viewBooking.depositPDF || viewBooking.finalBookingPDF) && (
                <div className="col-12 mt-3">
                  <h5 className="text-primary mb-3">Documents</h5>
                  <div className="d-flex gap-2">
                    {viewBooking.depositPDF && (
                      <Button 
                        variant="success" 
                        size="sm"
                        href={`https://varahibackend.varahiselfdrivecars.com${viewBooking.depositPDF}`}
                        target="_blank"
                      >
                        <i className="fas fa-file-pdf me-2"></i>Deposit PDF
                      </Button>
                    )}
                    {viewBooking.finalBookingPDF && (
                      <Button 
                        variant="info" 
                        size="sm"
                        href={`https://varahibackend.varahiselfdrivecars.com${viewBooking.finalBookingPDF}`}
                        target="_blank"
                      >
                        <i className="fas fa-file-pdf me-2"></i>Final Booking PDF
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {viewBooking.returnDetails && viewBooking.returnDetails.length > 0 && (
                <div className="col-12 mt-3">
                  <h5 className="text-primary mb-3">Return Details</h5>
                  {viewBooking.returnDetails.map((detail, idx) => (
                    <div key={idx} className="border p-3 mb-2 rounded">
                      <div className="row">
                        <div className="col-md-4"><strong>Return Date:</strong> {detail.returnDate ? new Date(detail.returnDate).toLocaleDateString() : '-'}</div>
                        <div className="col-md-4"><strong>Return Time:</strong> {detail.returnTime || '-'}</div>
                        <div className="col-md-4"><strong>Delay Time:</strong> {detail.delayTime || 0} hours</div>
                        <div className="col-md-4"><strong>Delay Days:</strong> {detail.delayDay || 0}</div>
                        <div className="col-md-8"><strong>Returned By:</strong> {detail.name} ({detail.mobile})</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {viewBooking.carReplacementHistory && viewBooking.carReplacementHistory.length > 0 && (
                <div className="col-12 mt-3">
                  <h5 className="text-primary mb-3">Car Replacement History</h5>
                  {viewBooking.carReplacementHistory.map((replacement, idx) => (
                    <div key={idx} className="border p-3 mb-2 rounded bg-warning bg-opacity-10">
                      <div className="row">
                        <div className="col-md-6"><strong>Old Car:</strong> {replacement.oldCarId?.carName || '-'}</div>
                        <div className="col-md-6"><strong>New Car:</strong> {replacement.newCarId?.carName || '-'}</div>
                        <div className="col-md-4"><strong>Replaced At:</strong> {replacement.replacedAt ? new Date(replacement.replacedAt).toLocaleString() : '-'}</div>
                        <div className="col-md-4"><strong>Payment Adjustment:</strong> ₹{replacement.paymentAdjustment || 0}</div>
                        <div className="col-md-4"><strong>Staff Payment:</strong> {replacement.staffPaymentStatus || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Spinner animation="border" variant="primary" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeBookingViewModal}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Vehicles;
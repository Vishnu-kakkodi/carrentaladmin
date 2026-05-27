import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Table, Button, Modal, Form, Pagination, Badge, Row, Col, InputGroup, Card, Spinner } from "react-bootstrap";
import { ToastContainer, toast } from 'react-toastify';
import * as XLSX from "xlsx";
import 'react-toastify/dist/ReactToastify.css';

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_live_R7WEc7UNXkN075';

// Load Razorpay script dynamically
const loadRazorpayScript = (src) => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showExtensionsModal, setShowExtensionsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterField, setFilterField] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [replacedCarDetails, setReplacedCarDetails] = useState({ oldCar: null, newCar: null });
  const [extensionData, setExtensionData] = useState({
    extendDeliveryDate: "",
    extendDeliveryTime: "",
    hours: "",
    amount: ""
  });
  const [replaceData, setReplaceData] = useState({
    newCarId: "",
    transactionId: "",
    amount: "",
    staffRefund: "",
    paymentType: "none"
  });
  const [cars, setCars] = useState([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isReplacingCar, setIsReplacingCar] = useState(false);

  // Pagination state from backend
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBookings: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Date Filters
  const [rentalStartDateFilter, setRentalStartDateFilter] = useState("");
  const [rentalEndDateFilter, setRentalEndDateFilter] = useState("");
  const [createdDateFilter, setCreatedDateFilter] = useState("");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const bookingsPerPage = 10;

  // Fetch owner bookings with pagination and filters
  const fetchOwnerBookings = async (page = 1, searchBy = null, searchValue = null, startDate = null, endDate = null, createdDate = null) => {
    try {
      setIsLoading(true);
      
      let url = `https://varahibackend.varahiselfdrivecars.com/api/staff/allownerbookings?page=${page}&limit=${bookingsPerPage}`;
      
      // Add search parameters if provided
      if (searchBy && searchValue) {
        url += `&searchBy=${searchBy}&searchValue=${searchValue}`;
      }
      
      // Add date filters if provided
      if (startDate) {
        url += `&rentalstartdate=${startDate}`;
      }
      if (endDate) {
        url += `&rentalenddate=${endDate}`;
      }
      if (createdDate) {
        url += `&createdat=${createdDate}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data?.bookings) {
        setBookings(response.data.bookings);
        setFilteredBookings(response.data.bookings);
        setPagination(response.data.pagination);
        setCurrentPage(response.data.pagination.currentPage);
      }
    } catch (error) {
      console.error("Error fetching owner bookings:", error);
      toast.error("Failed to fetch owner bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCars = async () => {
    try {
      const response = await axios.get("https://varahibackend.varahiselfdrivecars.com/api/car/get-cars");
      if (response.data?.cars) setCars(response.data.cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch available cars.");
    }
  };

  const fetchCarDetails = async (carId) => {
    if (!carId) return null;
    try {
      const response = await axios.get(
        `https://varahibackend.varahiselfdrivecars.com/api/car/getcar/${carId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching car details for ${carId}:`, error);
      return null;
    }
  };

  // Normalise booking to have userId field (API returns user)
  const normaliseBooking = (b) => ({
    ...b,
    userId: b.userId ?? b.user ?? null,
  });

  const fetchBookingDetails = async (bookingId) => {
    try {
      const existingBooking = bookings.find((b) => b._id === bookingId);
      const response = await axios.get(
        `https://varahibackend.varahiselfdrivecars.com/api/staff/singlebooking/${bookingId}`
      );
      if (response.data?.booking) {
        const combinedBooking = {
          ...response.data.booking,
          delayedPaymentProof: existingBooking?.delayedPaymentProof,
          userId: response.data.booking.userId ?? response.data.booking.user ?? null,
        };
        setBookingDetails(combinedBooking);

        if (combinedBooking.carReplacementHistory?.length > 0) {
          const latest = combinedBooking.carReplacementHistory[combinedBooking.carReplacementHistory.length - 1];
          const [oldCarDetails, newCarDetails] = await Promise.all([
            latest.oldCarId?._id ? fetchCarDetails(latest.oldCarId._id) : null,
            latest.newCarId?._id ? fetchCarDetails(latest.newCarId._id) : null,
          ]);
          setReplacedCarDetails({
            oldCar: oldCarDetails ?? latest.oldCarId,
            newCar: newCarDetails ?? latest.newCarId,
          });
        } else {
          setReplacedCarDetails({ oldCar: null, newCar: null });
        }
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
      toast.error("Failed to fetch booking details.");
    }
  };

  // Handle search with API
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim()) {
      let searchBy = filterField;
      let searchValue = searchQuery;
      
      // Map filter field to API expected field names
      if (filterField === 'ownername') {
        searchBy = 'ownername';
      } else if (filterField === 'owneremail') {
        searchBy = 'owneremail';
      } else if (filterField === 'name') {
        searchBy = 'name';
      } else if (filterField === 'email') {
        searchBy = 'email';
      } else if (filterField === 'id') {
        searchBy = 'id';
      } else if (filterField === 'pickuplocation') {
        searchBy = 'pickuplocation';
      } else if (filterField === 'status') {
        searchBy = 'status';
      } else if (filterField === 'paymentstatus') {
        searchBy = 'paymentstatus';
      }
      
      await fetchOwnerBookings(1, searchBy, searchValue);
    } else {
      await fetchOwnerBookings(1);
    }
  }, [searchQuery, filterField]);

  // Apply date filters with API
  const filterByDates = useCallback(async () => {
    if (rentalStartDateFilter || rentalEndDateFilter || createdDateFilter) {
      await fetchOwnerBookings(
        1, 
        null, 
        null, 
        rentalStartDateFilter || null, 
        rentalEndDateFilter || null, 
        createdDateFilter || null
      );
    } else if (!searchQuery.trim()) {
      await fetchOwnerBookings(1);
    }
  }, [rentalStartDateFilter, rentalEndDateFilter, createdDateFilter]);

  useEffect(() => { 
    fetchOwnerBookings(); 
    fetchCars(); 
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      filterByDates();
    }
  }, [filterByDates, searchQuery]);

  const handleEdit = (booking) => {
    const nb = normaliseBooking(booking);
    setSelectedBooking({ ...nb, editedAmount: nb.totalPrice });
    setShowEditModal(true);
  };

  const handleExtend = (booking) => {
    setSelectedBooking(normaliseBooking(booking));
    setExtensionData({ extendDeliveryDate: "", extendDeliveryTime: "", hours: "", amount: "" });
    setShowExtendModal(true);
  };

  const handleViewExtensions = (booking) => {
    setSelectedBooking(normaliseBooking(booking));
    setShowExtensionsModal(true);
  };

  const handleReplace = (booking) => {
    setSelectedBooking(normaliseBooking(booking));
    setReplaceData({ newCarId: "", transactionId: "", amount: "", staffRefund: "", paymentType: "none" });
    setShowReplaceModal(true);
  };

  const handleGenerateOTP = async (bookingId) => {
    try {
      toast.info("Generating OTP...", { autoClose: false, toastId: 'otp-loading' });
      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/staff/update-otp/${bookingId}`
      );
      toast.dismiss('otp-loading');
      if (response.data?.otp) {
        toast.success(`OTP generated successfully: ${response.data.otp}`, { autoClose: 5000 });
      } else {
        toast.success("OTP generated successfully!");
      }
      await fetchOwnerBookings(currentPage);
    } catch (error) {
      toast.dismiss('otp-loading');
      const msg = error.response?.data?.message || error.response?.data?.error || "Failed to generate OTP";
      toast.error(`Error: ${msg}`);
    }
  };

  const initRazorpayPayment = async () => {
    try {
      if (!selectedBooking) { toast.error("No booking selected"); return; }
      const userId = selectedBooking.userId?._id;
      const bookingId = selectedBooking._id;
      if (!userId) { toast.error("User ID not found in booking data"); return; }
      if (!extensionData.amount || parseFloat(extensionData.amount) <= 0) {
        toast.error("Please enter a valid extension amount"); return;
      }
      if (!extensionData.hours && (!extensionData.extendDeliveryDate || !extensionData.extendDeliveryTime)) {
        toast.error("Please provide either hours or date/time for extension"); return;
      }

      setIsProcessingPayment(true);
      toast.info("Initializing payment gateway...", { autoClose: 1500 });

      const isScriptLoaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isScriptLoaded) {
        toast.error("Payment gateway failed to load."); setIsProcessingPayment(false); return;
      }
      await new Promise((r) => setTimeout(r, 500));
      if (!window.Razorpay) {
        toast.error("Payment service unavailable. Refresh and try again."); setIsProcessingPayment(false); return;
      }

      const amountInPaise = Math.round(parseFloat(extensionData.amount) * 100);
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "Car Rental Extension",
        description: `Booking Extension - ${bookingId.slice(-6)}`,
        handler: async (response) => { await handleExtensionPaymentSuccess(response.razorpay_payment_id); },
        prefill: { name: selectedBooking.userId?.name || "", email: selectedBooking.userId?.email || "", contact: selectedBooking.userId?.mobile || "" },
        notes: { bookingId, userId, extensionType: extensionData.hours ? 'hours' : 'datetime', value: extensionData.hours || `${extensionData.extendDeliveryDate} ${extensionData.extendDeliveryTime}` },
        theme: { color: "#3399cc" },
        modal: { ondismiss: () => { if (!isProcessingPayment) toast.info("Payment was cancelled"); setIsProcessingPayment(false); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => {
        toast.error(`Payment Failed: ${r.error?.description || 'Payment failed'}`);
        setIsProcessingPayment(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      toast.error("Failed to initialize payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handleExtensionPaymentSuccess = async (paymentId) => {
    try {
      if (!selectedBooking) return;
      const userId = selectedBooking.userId?._id;
      const bookingId = selectedBooking._id;
      if (!userId) { toast.error("User ID not found"); setIsProcessingPayment(false); return; }

      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/users/extendbookings/${userId}/${bookingId}`,
        { ...extensionData, transactionId: paymentId }
      );
      if (response.data.message) {
        toast.success(response.data.message);
        setShowExtendModal(false);
        await fetchOwnerBookings(currentPage);
        setExtensionData({ extendDeliveryDate: "", extendDeliveryTime: "", hours: "", amount: "" });
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || "Failed to extend booking";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleReplaceCar = async () => {
    try {
      if (!selectedBooking) { toast.error("No booking selected"); return; }
      const userId = selectedBooking.userId?._id;
      if (!userId) { toast.error("User ID not found"); return; }
      if (!replaceData.newCarId) { toast.error("Please select a new car"); return; }

      setIsReplacingCar(true);
      let payload = { bookingId: selectedBooking._id, newCarId: replaceData.newCarId };

      if (replaceData.staffRefund) {
        payload.staffRefund = parseFloat(replaceData.staffRefund);
        if (replaceData.amount && replaceData.transactionId) {
          payload.amount = parseFloat(replaceData.amount);
          payload.transactionId = replaceData.transactionId;
        }
      } else if (replaceData.requirePayment && replaceData.transactionId && replaceData.amount) {
        payload.transactionId = replaceData.transactionId;
        payload.amount = parseFloat(replaceData.amount);
      }

      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/users/replace-car/${userId}`,
        payload
      );
      if (response.data.message) {
        toast.success(response.data.message);
        setShowReplaceModal(false);
        await fetchOwnerBookings(currentPage);
        setReplaceData({ newCarId: "", transactionId: "", amount: "", staffRefund: "", requirePayment: false });
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || "Failed to replace car";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsReplacingCar(false);
    }
  };

  const initReplaceCarPayment = async () => {
    try {
      if (!selectedBooking) { toast.error("No booking selected"); return; }
      if (!replaceData.amount || parseFloat(replaceData.amount) <= 0) {
        toast.error("Please enter a valid amount"); return;
      }
      setIsProcessingPayment(true);
      toast.info("Initializing payment gateway...", { autoClose: 1500 });

      const isScriptLoaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isScriptLoaded) { toast.error("Payment gateway failed to load."); setIsProcessingPayment(false); return; }
      await new Promise((r) => setTimeout(r, 500));
      if (!window.Razorpay) { toast.error("Payment service unavailable."); setIsProcessingPayment(false); return; }

      const bookingId = selectedBooking._id;
      const amountInPaise = Math.round(parseFloat(replaceData.amount) * 100);
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "Car Replacement Payment",
        description: `Car Replacement - Booking ${bookingId.slice(-6)}`,
        handler: async (response) => {
          setReplaceData((prev) => ({ ...prev, transactionId: response.razorpay_payment_id }));
          await new Promise((r) => setTimeout(r, 100));
          await handleReplaceCar();
        },
        prefill: { name: selectedBooking.userId?.name || "", email: selectedBooking.userId?.email || "", contact: selectedBooking.userId?.mobile || "" },
        notes: { bookingId, purpose: "car_replacement" },
        theme: { color: "#3399cc" },
        modal: { ondismiss: () => { toast.info("Payment was cancelled"); setIsProcessingPayment(false); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => {
        toast.error(`Payment Failed: ${r.error?.description || 'Payment failed'}`);
        setIsProcessingPayment(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      toast.error("Failed to initialize payment.");
      setIsProcessingPayment(false);
    }
  };

  const handleViewDetails = (bookingId) => fetchBookingDetails(bookingId);

  const handleSaveChanges = async () => {
    try {
      const { _id, status, paymentStatus, editedAmount } = selectedBooking;
      await axios.put(`https://varahibackend.varahiselfdrivecars.com/api/admin/statusbookings/${_id}`, { status });
      await axios.put(`https://varahibackend.varahiselfdrivecars.com/api/admin/payment-status/${_id}`, {
        paymentStatus, amount: editedAmount
      });
      await fetchOwnerBookings(currentPage);
      setShowEditModal(false);
      toast.success("Booking updated successfully!");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking.");
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await axios.delete(`https://varahibackend.varahiselfdrivecars.com/api/admin/deletebooking/${bookingId}`);
        await fetchOwnerBookings(currentPage);
        toast.success("Booking deleted successfully!");
      } catch (error) {
        console.error("Error deleting booking:", error);
        toast.error("Failed to delete booking.");
      }
    }
  };

  // Badge helpers
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

  const getReplacementBadge = (booking) => {
    if (booking?.carReplacementHistory?.length > 0) {
      return <Badge bg="warning" className="ms-1">Car Replaced</Badge>;
    }
    return null;
  };

  const getReplacementStatus = (booking) => {
    if (booking?.carReplacementHistory?.length > 0) {
      return <Badge bg="warning" className="text-capitalize">Yes</Badge>;
    }
    return <Badge bg="secondary" className="text-capitalize">No</Badge>;
  };

  const renderCarInfo = (booking) => (
    <div>
      <strong>{booking.car?.carName || 'N/A'}</strong>
      {getReplacementBadge(booking)}
    </div>
  );

  const renderExtensions = (booking) => {
    const count = booking.extensions?.length || 0;
    if (count === 0) return <Badge bg="secondary">No Extensions</Badge>;
    return (
      <div>
        <Badge bg="info">{count} Extension{count > 1 ? 's' : ''}</Badge>
        <Button variant="link" size="sm" className="p-0 ms-2" onClick={() => handleViewExtensions(normaliseBooking(booking))}>
          View Details
        </Button>
      </div>
    );
  };

  // Pagination
  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages < 1) return null;
    const pageSet = new Set([1, pagination.totalPages]);
    if (pagination.currentPage > 1) pageSet.add(pagination.currentPage - 1);
    pageSet.add(pagination.currentPage);
    if (pagination.currentPage < pagination.totalPages) pageSet.add(pagination.currentPage + 1);

    const pages = [];
    let lastPage = 0;
    Array.from(pageSet).sort((a, b) => a - b).forEach((page) => {
      if (page - lastPage > 1) pages.push(<Pagination.Ellipsis key={`e-${page}`} disabled />);
      pages.push(
        <Pagination.Item key={page} active={page === pagination.currentPage} onClick={() => handlePageChange(page)}>
          {page}
        </Pagination.Item>
      );
      lastPage = page;
    });

    return (
      <Pagination className="mt-3 justify-content-center">
        <Pagination.Item disabled={!pagination.hasPrevPage} onClick={() => pagination.hasPrevPage && handlePageChange(pagination.currentPage - 1)}>Prev</Pagination.Item>
        {pages}
        <Pagination.Item disabled={!pagination.hasNextPage} onClick={() => pagination.hasNextPage && handlePageChange(pagination.currentPage + 1)}>Next</Pagination.Item>
      </Pagination>
    );
  };

  const handlePageChange = (page) => {
    if (searchQuery.trim()) {
      let searchBy = filterField;
      if (filterField === 'ownername') searchBy = 'ownername';
      else if (filterField === 'owneremail') searchBy = 'owneremail';
      else if (filterField === 'name') searchBy = 'name';
      else if (filterField === 'email') searchBy = 'email';
      else if (filterField === 'id') searchBy = 'id';
      
      fetchOwnerBookings(page, searchBy, searchQuery);
    } else if (rentalStartDateFilter || rentalEndDateFilter || createdDateFilter) {
      fetchOwnerBookings(page, null, null, rentalStartDateFilter || null, rentalEndDateFilter || null, createdDateFilter || null);
    } else {
      fetchOwnerBookings(page);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterField("name");
    setRentalStartDateFilter("");
    setRentalEndDateFilter("");
    setCreatedDateFilter("");
    fetchOwnerBookings(1);
  };

  // Excel Export
  const handleDownloadExcel = async () => {
    try {
      setIsDownloading(true);
      toast.info('Preparing owner bookings report...', { autoClose: 2000 });

      const dataToExport = filteredBookings.map((raw) => {
        const booking = normaliseBooking(raw);
        return {
          'Booking ID': booking._id || '-',
          'User Name': booking.userId?.name || '-',
          'User Email': booking.userId?.email || '-',
          'User Mobile': booking.userId?.mobile || '-',
          'Car Name': booking.car?.carName || '-',
          'Car Model': booking.car?.model || '-',
          'Vehicle Number': booking.car?.vehicleNumber || '-',
          'Car Year': booking.car?.year || '-',
          'Car Type': booking.car?.carType || '-',
          'Fuel': booking.car?.fuel || '-',
          'Seats': booking.car?.seats || '-',
          'Car Location': booking.car?.location || '-',
          'Car Status': booking.car?.status || '-',
          'Owner Name': booking.car?.owner?.fullName || '-',
          'Owner Email': booking.car?.owner?.email || '-',
          'Owner Mobile': booking.car?.owner?.mobileNumber || '-',
          'Car Replacement': booking.carReplacementHistory?.length > 0 ? 'Yes' : 'No',
          'Extension Count': booking.extensions?.length || 0,
          'Total Extension Amount': booking.extensions?.reduce((s, e) => s + (e.amount || 0), 0) || 0,
          'Rental Start Date': booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : '-',
          'Rental End Date': booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : '-',
          'Timings': `${booking.from || '-'} - ${booking.to || '-'}`,
          'Total Price': booking.totalPrice || 0,
          'Owner Commission (%)': booking.ownerCommission?.percentage || 0,
          'Owner Commission Amount': booking.ownerCommission?.amount || 0,
          'Pickup Location': booking.pickupLocation || '-',
          'Status': booking.status || '-',
          'Payment Status': booking.paymentStatus || '-',
          'OTP': booking.otp || '-',
          'Return OTP': booking.returnOTP || '-',
          'Deposit Amount': booking.deposit || 0,
          'Transaction ID': booking.transactionId || '-',
          'Customer Took Car': booking.customerTookCar ? 'Yes' : 'No',
          'Advance Paid Status': booking.advancePaidStatus ? 'Yes' : 'No',
          'Booking Created Date': booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-',
          'Booking Created Time': booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : '-',
          'Last Updated Date': booking.updatedAt ? new Date(booking.updatedAt).toLocaleDateString() : '-',
          'Last Updated Time': booking.updatedAt ? new Date(booking.updatedAt).toLocaleTimeString() : '-',
        };
      });

      if (dataToExport.length === 0) {
        toast.warning('No data to export!');
        setIsDownloading(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "OwnerBookings");
      ws['!cols'] = Array(Object.keys(dataToExport[0]).length).fill({ wch: 22 });

      const dateStr = new Date().toISOString().split('T')[0];
      let filename = `owner_bookings_${dateStr}`;
      if (rentalStartDateFilter || rentalEndDateFilter || createdDateFilter) {
        filename += '_filtered';
        if (rentalStartDateFilter) filename += `_start_${rentalStartDateFilter}`;
        if (rentalEndDateFilter) filename += `_end_${rentalEndDateFilter}`;
        if (createdDateFilter) filename += `_created_${createdDateFilter}`;
      }
      filename += '.xlsx';

      XLSX.writeFile(wb, filename);
      toast.success(`${dataToExport.length} bookings exported successfully!`, { autoClose: 2000 });
    } catch (error) {
      console.error('Excel error:', error);
      toast.error('Failed to generate Excel: ' + error.message, { autoClose: 2000 });
    } finally {
      setIsDownloading(false);
    }
  };

  // Render
  return (
    <div className="container-fluid mt-4 px-3 px-md-4">
      <ToastContainer position="top-right" autoClose={2000} />

      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="mb-0">Owner Bookings Management</h2>
        <Badge bg="info" className="p-2 align-self-start align-self-md-center">
          Showing {filteredBookings.length} of {pagination.totalBookings} bookings | Page {pagination.currentPage} of {pagination.totalPages}
        </Badge>
      </div>

      {/* Filter Section */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} md={3}>
              <Form.Label className="fw-semibold">Search Field</Form.Label>
              <Form.Select 
                value={filterField} 
                onChange={(e) => setFilterField(e.target.value)}
                className="w-100"
              >
                <option value="id">Booking ID</option>
                <option value="name">User Name</option>
                <option value="email">User Email</option>
                <option value="ownername">Owner Name</option>
                <option value="owneremail">Owner Email</option>
                <option value="pickuplocation">Pickup Location</option>
                <option value="status">Status</option>
                <option value="paymentstatus">Payment Status</option>
              </Form.Select>
            </Col>

            <Col xs={12} md={3}>
              <Form.Label className="fw-semibold">Search Value</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder={`Search by ${filterField === 'ownername' ? 'Owner Name' : filterField === 'owneremail' ? 'Owner Email' : filterField === 'name' ? 'User Name' : filterField === 'email' ? 'User Email' : filterField}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="primary" onClick={handleSearch}>
                  <i className="fas fa-search me-1"></i> Search
                </Button>
              </InputGroup>
            </Col>

            <Col xs={12} md={2}>
              <Form.Label className="fw-semibold">Rental Start Date</Form.Label>
              <Form.Control
                type="date"
                value={rentalStartDateFilter}
                onChange={(e) => setRentalStartDateFilter(e.target.value)}
              />
            </Col>

            <Col xs={12} md={2}>
              <Form.Label className="fw-semibold">Rental End Date</Form.Label>
              <Form.Control
                type="date"
                value={rentalEndDateFilter}
                onChange={(e) => setRentalEndDateFilter(e.target.value)}
              />
            </Col>

            <Col xs={12} md={2}>
              <Form.Label className="fw-semibold">Created Date</Form.Label>
              <Form.Control
                type="date"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
              />
            </Col>
          </Row>

          <Row className="mt-3">
            <Col xs={12} className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={clearAllFilters}
              >
                <i className="fas fa-times me-2"></i>Clear All Filters
              </Button>

              <Button 
                variant="success" 
                size="sm"
                onClick={handleDownloadExcel}
                disabled={isDownloading || filteredBookings.length === 0}
              >
                {isDownloading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-excel me-2"></i>Export to Excel
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table Section with Scrollable Container */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading owner bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">No owner bookings found matching your criteria.</p>
              </div>
            ) : (
              <Table bordered hover responsive className="mb-0">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
                  <tr className="table-header">
                    <th style={{ minWidth: '60px' }}>S.NO</th>
                    <th style={{ minWidth: '100px' }}>Booking ID</th>
                    <th style={{ minWidth: '120px' }}>User Name</th>
                    <th style={{ minWidth: '180px' }}>User Email</th>
                    <th style={{ minWidth: '140px' }}>Car</th>
                    <th style={{ minWidth: '120px' }}>Model</th>
                    <th style={{ minWidth: '120px' }}>Vehicle No.</th>
                    <th style={{ minWidth: '140px' }}>Owner Name</th>
                    <th style={{ minWidth: '180px' }}>Owner Email</th>
                    <th style={{ minWidth: '100px' }}>Replaced</th>
                    <th style={{ minWidth: '120px' }}>Extensions</th>
                    <th style={{ minWidth: '120px' }}>Rental Start</th>
                    <th style={{ minWidth: '120px' }}>Rental End</th>
                    <th style={{ minWidth: '120px' }}>Created Date</th>
                    <th style={{ minWidth: '100px' }}>Timings</th>
                    <th style={{ minWidth: '100px' }}>Total Price</th>
                    <th style={{ minWidth: '100px' }}>Owner Comm.</th>
                    <th style={{ minWidth: '150px' }}>Pickup Location</th>
                    <th style={{ minWidth: '100px' }}>Status</th>
                    <th style={{ minWidth: '100px' }}>Payment</th>
                    <th style={{ minWidth: '80px' }}>OTP</th>
                    <th style={{ minWidth: '80px' }}>Return OTP</th>
                    <th style={{ minWidth: '180px' }}>Actions</th>
                    <th style={{ minWidth: '80px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((raw, index) => {
                    const booking = normaliseBooking(raw);
                    return (
                      <tr key={booking._id} className={booking.carReplacementHistory?.length > 0 ? 'table-info' : ''}>
                        <td className="text-center">{((pagination.currentPage - 1) * bookingsPerPage) + index + 1}</td>
                        <td className="align-middle">{booking._id?.slice(-8) || 'N/A'}</td>
                        <td className="align-middle">{booking.userId?.name || 'N/A'}</td>
                        <td className="align-middle">{booking.userId?.email || 'N/A'}</td>
                        <td className="align-middle">{renderCarInfo(booking)}</td>
                        <td className="align-middle">{booking.car?.model || 'N/A'}</td>
                        <td className="align-middle">{booking.car?.vehicleNumber || 'N/A'}</td>
                        <td className="align-middle">{booking.car?.owner?.fullName || 'N/A'}</td>
                        <td className="align-middle">{booking.car?.owner?.email || 'N/A'}</td>
                        <td className="align-middle">{getReplacementStatus(booking)}</td>
                        <td className="align-middle">{renderExtensions(booking)}</td>
                        <td className="align-middle">{booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="align-middle">{booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="align-middle">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="align-middle">{booking.from || 'N/A'} - {booking.to || 'N/A'}</td>
                        <td className="align-middle">₹{booking.totalPrice || '0'}</td>
                        <td className="align-middle">
                          ₹{booking.ownerCommission?.amount || 0}
                          <br />
                          <small className="text-muted">({booking.ownerCommission?.percentage || 0}%)</small>
                        </td>
                        <td className="align-middle">{booking.pickupLocation || 'N/A'}</td>
                        <td className="align-middle">
                          <Badge bg={getStatusBadge(booking.status)} className="text-capitalize">
                            {booking.status || 'N/A'}
                          </Badge>
                        </td>
                        <td className="align-middle">
                          <Badge bg={getPaymentBadge(booking.paymentStatus)} className="text-capitalize">
                            {booking.paymentStatus || 'N/A'}
                          </Badge>
                        </td>
                        <td className="align-middle">
                          {booking.otp || 'N/A'}
                          {!booking.otp && (
                            <Button 
                              variant="outline-success" 
                              size="sm" 
                              className="ms-1"
                              onClick={() => handleGenerateOTP(booking._id)}
                              title="Generate OTP"
                            >
                              <i className="fas fa-key"></i>
                            </Button>
                          )}
                        </td>
                        <td className="align-middle">{booking.returnOTP || 'N/A'}</td>
                        <td className="align-middle">
                          <div className="d-flex flex-wrap gap-1">
                            <Button variant="outline-warning" size="sm" onClick={() => handleEdit(booking)} title="Edit">
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => handleExtend(booking)} title="Extend">
                              <i className="fas fa-clock"></i>
                            </Button>
                            <Button variant="outline-info" size="sm" onClick={() => handleReplace(booking)} title="Replace Car">
                              <i className="fas fa-exchange-alt"></i>
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(booking._id)} title="Delete">
                              <i className="fas fa-trash-alt"></i>
                            </Button>
                          </div>
                        </td>
                        <td className="align-middle">
                          <Button variant="outline-info" size="sm" onClick={() => handleViewDetails(booking._id)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>

          {/* Pagination Section */}
          {!isLoading && filteredBookings.length > 0 && renderPagination()}

          {/* Pagination Info */}
          {!isLoading && filteredBookings.length > 0 && (
            <div className="text-center text-muted mt-3 pb-3">
              <small>
                Showing {filteredBookings.length} of {pagination.totalBookings} bookings | 
                Page {pagination.currentPage} of {pagination.totalPages}
              </small>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modals - Edit, Extend, Replace, View Extensions, Details (same as before) */}
      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>Edit Booking</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select value={selectedBooking.status} onChange={(e) => setSelectedBooking({ ...selectedBooking, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Payment Status</Form.Label>
                <Form.Select value={selectedBooking.paymentStatus} onChange={(e) => setSelectedBooking({ ...selectedBooking, paymentStatus: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Payment Amount (₹)</Form.Label>
                <Form.Control type="number" value={selectedBooking.editedAmount} onChange={(e) => setSelectedBooking({ ...selectedBooking, editedAmount: e.target.value })} />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Extend Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Extend Booking</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <div className="mb-3">
                <p><strong>Booking ID:</strong> {selectedBooking._id}</p>
                <p><strong>User:</strong> {selectedBooking.userId?.name} ({selectedBooking.userId?.email})</p>
                <p><strong>Current End:</strong> {new Date(selectedBooking.rentalEndDate).toLocaleDateString()} {selectedBooking.to}</p>
                {selectedBooking.extensions?.length > 0 && (
                  <div className="alert alert-info"><strong>Previous Extensions:</strong> {selectedBooking.extensions.length}</div>
                )}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Extension Hours</Form.Label>
                <Form.Control type="number" placeholder="Enter hours to extend" value={extensionData.hours} onChange={(e) => setExtensionData({ ...extensionData, hours: e.target.value })} min="1" />
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Extended Delivery Date</Form.Label>
                    <Form.Control type="date" value={extensionData.extendDeliveryDate} onChange={(e) => setExtensionData({ ...extensionData, extendDeliveryDate: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Extended Delivery Time</Form.Label>
                    <Form.Control type="time" value={extensionData.extendDeliveryTime} onChange={(e) => setExtensionData({ ...extensionData, extendDeliveryTime: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Extension Amount (₹)</Form.Label>
                <Form.Control type="number" placeholder="Enter amount" value={extensionData.amount} onChange={(e) => setExtensionData({ ...extensionData, amount: e.target.value })} required min="1" step="0.01" />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtendModal(false)} disabled={isProcessingPayment}>Cancel</Button>
          <Button variant="success" onClick={initRazorpayPayment} disabled={isProcessingPayment || !extensionData.amount}>
            {isProcessingPayment ? <><Spinner size="sm" className="me-2" />Processing...</> : <><i className="fas fa-credit-card me-2" />Pay & Extend</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Replace Car Modal - condensed version */}
      <Modal show={showReplaceModal} onHide={() => setShowReplaceModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Replace Car in Booking</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <div className="mb-3">
                <p><strong>Booking ID:</strong> {selectedBooking._id}</p>
                <p><strong>Current Car:</strong> {selectedBooking.car?.carName} ({selectedBooking.car?.model})</p>
                <p><strong>Owner:</strong> {selectedBooking.car?.owner?.fullName}</p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Select New Car</Form.Label>
                <Form.Select value={replaceData.newCarId} onChange={(e) => setReplaceData({ ...replaceData, newCarId: e.target.value })} required>
                  <option value="">Select a car</option>
                  {cars.map((car) => (
                    <option key={car._id} value={car._id}>
                      {car.carName} - {car.model} - {car.vehicleNumber}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Staff Refund Amount (Optional)</Form.Label>
                <Form.Control type="number" placeholder="Enter staff refund amount" value={replaceData.staffRefund} onChange={(e) => setReplaceData({ ...replaceData, staffRefund: e.target.value })} min="0" />
              </Form.Group>

              {!replaceData.staffRefund && (
                <>
                  <Form.Check type="checkbox" label="Require Customer Payment" checked={replaceData.requirePayment} onChange={(e) => setReplaceData({ ...replaceData, requirePayment: e.target.checked })} className="mb-3" />
                  {replaceData.requirePayment && (
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Amount (₹)</Form.Label>
                      <Form.Control type="number" placeholder="Enter amount" value={replaceData.amount} onChange={(e) => setReplaceData({ ...replaceData, amount: e.target.value })} required min="1" />
                    </Form.Group>
                  )}
                </>
              )}
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReplaceModal(false)}>Cancel</Button>
          <Button variant="warning" onClick={handleReplaceCar} disabled={isReplacingCar || !replaceData.newCarId}>
            {isReplacingCar ? <><Spinner size="sm" className="me-2" />Replacing...</> : 'Replace Car'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Extensions Modal */}
      <Modal show={showExtensionsModal} onHide={() => setShowExtensionsModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Booking Extensions</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <>
              <h6>Extension History</h6>
              {selectedBooking.extensions?.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr><th>S.No</th><th>Extended Date</th><th>Extended Time</th><th>Hours</th><th>Amount (₹)</th><th>Transaction ID</th><th>Extended At</th></tr>
                  </thead>
                  <tbody>
                    {selectedBooking.extensions.map((ext, i) => (
                      <tr key={ext._id || i}>
                        <td>{i + 1}</td>
                        <td>{ext.extendDeliveryDate || '-'}</td>
                        <td>{ext.extendDeliveryTime || '-'}</td>
                        <td>{ext.hours || '-'}</td>
                        <td>₹{ext.amount || 0}</td>
                        <td>{ext.transactionId || '-'}</td>
                        <td>{ext.extendedAt ? new Date(ext.extendedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No extensions found.</p>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtensionsModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Details Modal - condensed */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl" scrollable>
        <Modal.Header closeButton><Modal.Title>Booking Details</Modal.Title></Modal.Header>
        <Modal.Body>
          {bookingDetails && (
            <div className="row">
              <div className="col-md-6">
                <h5>User Information</h5>
                <p><strong>Name:</strong> {bookingDetails.userId?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {bookingDetails.userId?.email || 'N/A'}</p>
                <p><strong>Mobile:</strong> {bookingDetails.userId?.mobile || 'N/A'}</p>
                
                <h5 className="mt-4">Owner Information</h5>
                <p><strong>Name:</strong> {bookingDetails.car?.owner?.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> {bookingDetails.car?.owner?.email || 'N/A'}</p>
                <p><strong>Mobile:</strong> {bookingDetails.car?.owner?.mobileNumber || 'N/A'}</p>
              </div>
              <div className="col-md-6">
                <h5>Booking Information</h5>
                <p><strong>Booking ID:</strong> {bookingDetails._id}</p>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(bookingDetails.status)}>{bookingDetails.status}</Badge></p>
                <p><strong>Payment Status:</strong> <Badge bg={getPaymentBadge(bookingDetails.paymentStatus)}>{bookingDetails.paymentStatus}</Badge></p>
                <p><strong>Total Price:</strong> ₹{bookingDetails.totalPrice}</p>
                <p><strong>Owner Commission:</strong> ₹{bookingDetails.ownerCommission?.amount || 0} ({bookingDetails.ownerCommission?.percentage || 0}%)</p>
                <p><strong>Rental Start:</strong> {new Date(bookingDetails.rentalStartDate).toLocaleDateString()}</p>
                <p><strong>Rental End:</strong> {new Date(bookingDetails.rentalEndDate).toLocaleDateString()}</p>
                <p><strong>Pickup Location:</strong> {bookingDetails.pickupLocation || 'N/A'}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OwnerBookings;
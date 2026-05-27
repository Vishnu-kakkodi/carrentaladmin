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
      console.log('Razorpay SDK already loaded');
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('Failed to load Razorpay SDK:', error);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const Bookings = () => {
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
  
  // Date Filters - Using string format for native date inputs
  const [rentalStartDateFilter, setRentalStartDateFilter] = useState("");
  const [rentalEndDateFilter, setRentalEndDateFilter] = useState("");
  const [createdDateFilter, setCreatedDateFilter] = useState("");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Excel download loading state
  const [isDownloading, setIsDownloading] = useState(false);
  
  const bookingsPerPage = 10;

  // Fetch bookings with pagination and filters
  const fetchBookings = async (page = 1, searchBy = null, searchValue = null) => {
    try {
      setIsLoading(true);
      
      let url = `https://varahibackend.varahiselfdrivecars.com/api/staff/allbookingsforadmin?page=${page}&limit=${bookingsPerPage}`;
      
      // Add search parameters if provided
      if (searchBy && searchValue) {
        url += `&searchBy=${searchBy}&searchValue=${searchValue}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data?.bookings) {
        setBookings(response.data.bookings);
        setFilteredBookings(response.data.bookings);
        setPagination(response.data.pagination);
        setCurrentPage(response.data.pagination.currentPage);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch bookings.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCars = async () => {
    try {
      const response = await axios.get("https://varahibackend.varahiselfdrivecars.com/api/car/get-cars");
      if (response.data?.cars) {
        setCars(response.data.cars);
      }
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch available cars.");
    }
  };

  const fetchCarDetails = async (carId) => {
    if (!carId) return null;
    try {
      const response = await axios.get(`https://varahibackend.varahiselfdrivecars.com/api/car/getcar/${carId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching car details for ${carId}:`, error);
      return null;
    }
  };

  const fetchBookingDetails = async (bookingId) => {
    try {
      const existingBooking = bookings.find(b => b._id === bookingId);
      const response = await axios.get(`https://varahibackend.varahiselfdrivecars.com/api/staff/singlebooking/${bookingId}`);

      if (response.data?.booking) {
        const combinedBooking = {
          ...response.data.booking,
          delayedPaymentProof: existingBooking?.delayedPaymentProof
        };

        setBookingDetails(combinedBooking);

        if (combinedBooking.carReplacementHistory && combinedBooking.carReplacementHistory.length > 0) {
          const latestReplacement = combinedBooking.carReplacementHistory[combinedBooking.carReplacementHistory.length - 1];
          const oldCarId = latestReplacement.oldCarId?._id;
          const newCarId = latestReplacement.newCarId?._id;

          const [oldCarDetails, newCarDetails] = await Promise.all([
            oldCarId ? fetchCarDetails(oldCarId) : null,
            newCarId ? fetchCarDetails(newCarId) : null
          ]);

          setReplacedCarDetails({
            oldCar: oldCarDetails || latestReplacement.oldCarId,
            newCar: newCarDetails || latestReplacement.newCarId
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
      
      await fetchBookings(1, searchBy, searchValue);
    } else {
      await fetchBookings(1);
    }
  }, [searchQuery, filterField]);

  // Apply date filters client-side when dates are selected without search query
  const filterByDates = useCallback(async () => {
    if (rentalStartDateFilter || rentalEndDateFilter || createdDateFilter) {
      setIsLoading(true);
      try {
        // Build URL with date parameters
        let url = `https://varahibackend.varahiselfdrivecars.com/api/staff/allbookingsforadmin?page=1&limit=${bookingsPerPage}`;
        
        if (rentalStartDateFilter) {
          url += `&rentalstartdate=${rentalStartDateFilter}`;
        }
        if (rentalEndDateFilter) {
          url += `&rentalenddate=${rentalEndDateFilter}`;
        }
        if (createdDateFilter) {
          url += `&createdat=${createdDateFilter}`;
        }
        
        const response = await axios.get(url);
        
        if (response.data?.bookings) {
          setBookings(response.data.bookings);
          setFilteredBookings(response.data.bookings);
          setPagination(response.data.pagination);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Error filtering by dates:", error);
        toast.error("Failed to filter bookings by date.");
      } finally {
        setIsLoading(false);
      }
    } else {
      await fetchBookings(1);
    }
  }, [rentalStartDateFilter, rentalEndDateFilter, createdDateFilter]);

  useEffect(() => {
    fetchBookings();
    fetchCars();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      filterByDates();
    }
  }, [filterByDates, searchQuery]);

  const handleEdit = (booking) => {
    setSelectedBooking({
      ...booking,
      editedAmount: booking.totalPrice
    });
    setShowEditModal(true);
  };

  const handleExtend = (booking) => {
    setSelectedBooking(booking);
    setExtensionData({
      extendDeliveryDate: "",
      extendDeliveryTime: "",
      hours: "",
      amount: ""
    });
    setShowExtendModal(true);
  };

  const handleViewExtensions = (booking) => {
    setSelectedBooking(booking);
    setShowExtensionsModal(true);
  };

  const handleReplace = (booking) => {
    setSelectedBooking(booking);
    setReplaceData({
      newCarId: "",
      transactionId: "",
      amount: "",
      staffRefund: "",
      paymentType: "none"
    });
    setShowReplaceModal(true);
  };

  const handleGenerateOTP = async (bookingId) => {
    try {
      toast.info("Generating OTP...", { autoClose: false, toastId: 'otp-loading' });
      
      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/staff/update-otp/${bookingId}`
      );
      
      toast.dismiss('otp-loading');
      
      if (response.data && response.data.otp) {
        toast.success(`OTP generated successfully: ${response.data.otp}`, {
          autoClose: 5000
        });
        
        await fetchBookings(currentPage);
      } else {
        toast.success("OTP generated successfully!");
        await fetchBookings(currentPage);
      }
    } catch (error) {
      toast.dismiss('otp-loading');
      console.error("Error generating OTP:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to generate OTP";
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const initRazorpayPayment = async () => {
    try {
      if (!selectedBooking) {
        toast.error("No booking selected");
        return;
      }

      const userId = selectedBooking.userId?._id;
      const bookingId = selectedBooking._id;

      if (!userId) {
        toast.error("User ID not found in booking data");
        return;
      }

      if (!extensionData.amount || parseFloat(extensionData.amount) <= 0) {
        toast.error("Please enter a valid extension amount");
        return;
      }

      if (!extensionData.hours && (!extensionData.extendDeliveryDate || !extensionData.extendDeliveryTime)) {
        toast.error("Please provide either hours or date/time for extension");
        return;
      }

      setIsProcessingPayment(true);
      toast.info("Initializing payment gateway...", { autoClose: 1500 });

      const isScriptLoaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      
      if (!isScriptLoaded) {
        toast.error("Payment gateway failed to load. Please check your connection and try again.");
        setIsProcessingPayment(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!window.Razorpay) {
        toast.error("Payment service is temporarily unavailable. Please refresh the page and try again.");
        setIsProcessingPayment(false);
        return;
      }

      const amountInPaise = Math.round(parseFloat(extensionData.amount) * 100);
      const currentDate = new Date().toLocaleDateString('en-IN');

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "Car Rental Extension",
        description: `Booking Extension - ${bookingId.slice(-6)}`,
        handler: async (response) => {
          await handleExtensionPaymentSuccess(response.razorpay_payment_id);
        },
        prefill: {
          name: selectedBooking.userId?.name || "",
          email: selectedBooking.userId?.email || "",
          contact: selectedBooking.userId?.mobile || ""
        },
        notes: {
          bookingId: bookingId,
          userId: userId,
          extensionDate: currentDate,
          extensionType: extensionData.hours ? 'hours' : 'datetime',
          value: extensionData.hours || `${extensionData.extendDeliveryDate} ${extensionData.extendDeliveryTime}`
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: function() {
            console.log('Checkout form closed by user');
            if (!isProcessingPayment) {
              toast.info("Payment was cancelled");
            }
            setIsProcessingPayment(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      
      razorpayInstance.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        const errorDescription = response.error?.description || response.error?.error?.description || 'Payment failed';
        toast.error(`Payment Failed: ${errorDescription}`);
        setIsProcessingPayment(false);
      });

      razorpayInstance.open();
      
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
      
      if (!userId) {
        toast.error("User ID not found in booking data");
        setIsProcessingPayment(false);
        return;
      }

      const extensionPayload = {
        ...extensionData,
        transactionId: paymentId
      };

      console.log("Sending extension request:", {
        userId,
        bookingId,
        payload: extensionPayload
      });

      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/users/extendbookings/${userId}/${bookingId}`,
        extensionPayload
      );

      if (response.data.message) {
        toast.success(response.data.message);
        setShowExtendModal(false);
        await fetchBookings(currentPage);
        
        setExtensionData({
          extendDeliveryDate: "",
          extendDeliveryTime: "",
          hours: "",
          amount: ""
        });
      }
    } catch (error) {
      console.error("Error extending booking:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to extend booking after payment";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleReplaceCar = async () => {
    try {
      if (!selectedBooking) {
        toast.error("No booking selected");
        return;
      }

      const userId = selectedBooking.userId?._id;
      const bookingId = selectedBooking._id;
      
      if (!userId) {
        toast.error("User ID not found in booking data");
        return;
      }

      if (!replaceData.newCarId) {
        toast.error("Please select a new car");
        return;
      }

      setIsReplacingCar(true);

      let payload = {
        bookingId,
        newCarId: replaceData.newCarId
      };

      if (replaceData.staffRefund) {
        payload.staffRefund = parseFloat(replaceData.staffRefund);
        
        if (replaceData.amount && replaceData.transactionId) {
          payload.amount = parseFloat(replaceData.amount);
          payload.transactionId = replaceData.transactionId;
        }
      } else {
        if (replaceData.requirePayment && replaceData.transactionId && replaceData.amount) {
          payload.transactionId = replaceData.transactionId;
          payload.amount = parseFloat(replaceData.amount);
        }
      }

      console.log("Sending car replacement request:", {
        userId,
        payload
      });

      const response = await axios.put(
        `https://varahibackend.varahiselfdrivecars.com/api/users/replace-car/${userId}`,
        payload
      );

      if (response.data.message) {
        toast.success(response.data.message);
        setShowReplaceModal(false);
        await fetchBookings(currentPage);
        
        setReplaceData({
          newCarId: "",
          transactionId: "",
          amount: "",
          staffRefund: "",
          requirePayment: false
        });
      }
    } catch (error) {
      console.error("Error replacing car:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to replace car";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsReplacingCar(false);
    }
  };

  const initReplaceCarPayment = async () => {
    try {
      if (!selectedBooking) {
        toast.error("No booking selected");
        return;
      }

      if (!replaceData.amount || parseFloat(replaceData.amount) <= 0) {
        toast.error("Please enter a valid amount for payment");
        return;
      }

      setIsProcessingPayment(true);
      toast.info("Initializing payment gateway...", { autoClose: 1500 });

      const isScriptLoaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      
      if (!isScriptLoaded) {
        toast.error("Payment gateway failed to load. Please check your connection and try again.");
        setIsProcessingPayment(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!window.Razorpay) {
        toast.error("Payment service is temporarily unavailable. Please refresh the page and try again.");
        setIsProcessingPayment(false);
        return;
      }

      const bookingId = selectedBooking._id;
      const amountInPaise = Math.round(parseFloat(replaceData.amount) * 100);
      const currentDate = new Date().toLocaleDateString('en-IN');

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "Car Replacement Payment",
        description: `Car Replacement - Booking ${bookingId.slice(-6)}`,
        handler: async (response) => {
          setReplaceData(prev => ({
            ...prev,
            transactionId: response.razorpay_payment_id
          }));
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await handleReplaceCar();
        },
        prefill: {
          name: selectedBooking.userId?.name || "",
          email: selectedBooking.userId?.email || "",
          contact: selectedBooking.userId?.mobile || ""
        },
        notes: {
          bookingId: bookingId,
          purpose: "car_replacement",
          date: currentDate
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: function() {
            console.log('Checkout form closed by user');
            toast.info("Payment was cancelled");
            setIsProcessingPayment(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      
      razorpayInstance.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        const errorDescription = response.error?.description || response.error?.error?.description || 'Payment failed';
        toast.error(`Payment Failed: ${errorDescription}`);
        setIsProcessingPayment(false);
      });

      razorpayInstance.open();
      
    } catch (error) {
      console.error("Error initializing Razorpay for replacement:", error);
      toast.error("Failed to initialize payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handleViewDetails = (bookingId) => {
    fetchBookingDetails(bookingId);
  };

  const handleSaveChanges = async () => {
    try {
      const { _id, status, paymentStatus, editedAmount } = selectedBooking;

      await axios.put(`https://varahibackend.varahiselfdrivecars.com/api/admin/statusbookings/${_id}`, { status });

      await axios.put(`https://varahibackend.varahiselfdrivecars.com/api/admin/payment-status/${_id}`, {
        paymentStatus,
        amount: editedAmount
      });

      await fetchBookings(currentPage);
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
        await fetchBookings(currentPage);
        toast.success("Booking deleted successfully!");
      } catch (error) {
        console.error("Error deleting booking:", error);
        toast.error("Failed to delete booking.");
      }
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

  const getReplacementBadge = (booking) => {
    const hasReplacement = booking?.carReplacementHistory && 
      booking.carReplacementHistory.length > 0;

    if (hasReplacement) {
      return (
        <Badge bg="warning" className="ms-1">
          Car Replaced
        </Badge>
      );
    }
    return null;
  };

  const getReplacementStatus = (booking) => {
    const hasReplacement = booking?.carReplacementHistory && 
      booking.carReplacementHistory.length > 0;

    if (hasReplacement) {
      return (
        <Badge bg="warning" className="text-capitalize">
          Yes
        </Badge>
      );
    }
    return (
      <Badge bg="secondary" className="text-capitalize">
        No
      </Badge>
    );
  };

  const renderPagination = () => {
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
    if (searchQuery.trim()) {
      fetchBookings(page, filterField, searchQuery);
    } else if (rentalStartDateFilter || rentalEndDateFilter || createdDateFilter) {
      let url = `https://varahibackend.varahiselfdrivecars.com/api/staff/allbookingsforadmin?page=${page}&limit=${bookingsPerPage}`;
      if (rentalStartDateFilter) url += `&rentalstartdate=${rentalStartDateFilter}`;
      if (rentalEndDateFilter) url += `&rentalenddate=${rentalEndDateFilter}`;
      if (createdDateFilter) url += `&createdat=${createdDateFilter}`;
      
      axios.get(url).then(response => {
        if (response.data?.bookings) {
          setBookings(response.data.bookings);
          setFilteredBookings(response.data.bookings);
          setPagination(response.data.pagination);
          setCurrentPage(page);
        }
      }).catch(error => {
        console.error("Error fetching bookings:", error);
        toast.error("Failed to fetch bookings.");
      });
    } else {
      fetchBookings(page);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setIsDownloading(true);
      toast.info('Preparing filtered booking report...', { autoClose: 2000 });

      const dataToExport = filteredBookings.map(booking => ({
        'Booking ID': booking._id || '-',
        'User Name': booking.userId?.name || '-',
        'User Email': booking.userId?.email || '-',
        'User Mobile': booking.userId?.mobile || '-',
        'Car Name': booking.car?.carName || '-',
        'Car Model': booking.car?.model || '-',
        'Vehicle Number': booking.car?.vehicleNumber || '-',
        'Car Replacement': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 ? 'Yes' : 'No',
        'Original Car': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.oldCarId?.carName || '-') 
          : '-',
        'Original Car Model': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.oldCarId?.model || '-') 
          : '-',
        'Replacement Car': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.newCarId?.carName || '-') 
          : '-',
        'Replacement Car Model': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.newCarId?.model || '-') 
          : '-',
        'Replaced At': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.replacedAt 
            ? new Date(booking.carReplacementHistory[booking.carReplacementHistory.length - 1].replacedAt).toLocaleString() 
            : '-')
          : '-',
        'Payment Adjustment': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.paymentAdjustment || 0) 
          : 0,
        'Staff Payment Status': booking.carReplacementHistory && booking.carReplacementHistory.length > 0 
          ? (booking.carReplacementHistory[booking.carReplacementHistory.length - 1]?.staffPaymentStatus || '-') 
          : '-',
        'Extension Count': booking.extensions?.length || 0,
        'Extension Details': booking.extensions && booking.extensions.length > 0 
          ? booking.extensions.map(ext => 
              `Date: ${ext.extendDeliveryDate || '-'}, Time: ${ext.extendDeliveryTime || '-'}, Hours: ${ext.hours || '-'}, Amount: ₹${ext.amount || 0}`
            ).join('; ')
          : 'No extensions',
        'Total Extension Amount': booking.extensions?.reduce((sum, ext) => sum + (ext.amount || 0), 0) || 0,
        'Rental Start Date': booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : '-',
        'Rental End Date': booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : '-',
        'Timings': `${booking.from || '-'} - ${booking.to || '-'}`,
        'Total Price': booking.totalPrice || 0,
        'Pickup Location': booking.pickupLocation || '-',
        'Status': booking.status || '-',
        'Payment Status': booking.paymentStatus || '-',
        'OTP': booking.otp || '-',
        'Return OTP': booking.returnOTP || '-',
        'Deposit Amount': booking.deposit || 0,
        'Aadhar Status': booking.userId?.documents?.aadharCard?.status || 'Not uploaded',
        'License Status': booking.userId?.documents?.drivingLicense?.status || 'Not uploaded',
        'Booking Created Date': booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-',
        'Booking Created Time': booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : '-',
        'Last Updated Date': booking.updatedAt ? new Date(booking.updatedAt).toLocaleDateString() : '-',
        'Last Updated Time': booking.updatedAt ? new Date(booking.updatedAt).toLocaleTimeString() : '-',
        'Deposit Proof Count': booking.depositeProof?.length || 0,
        'Car Return Images Count': booking.carReturnImages?.length || 0,
        'Car Pickup Images Count': booking.carImagesBeforePickup?.length || 0,
        'Delayed Payment Proof': booking.delayedPaymentProof?.url ? 'Available' : 'Not available',
        'Final Booking PDF': booking.finalBookingPDF ? 'Available' : 'Not available',
        'Deposit PDF': booking.depositPDF ? 'Available' : 'Not available',
        'Advance Paid Status': booking.advancePaidStatus ? 'Yes' : 'No',
        'Transaction ID': booking.transactionId || '-',
        'Customer Took Car': booking.customerTookCar ? 'Yes' : 'No',
        'Return Details Count': booking.returnDetails?.length || 0
      }));

      if (dataToExport.length === 0) {
        toast.warning('No data to export based on current filters!');
        setIsDownloading(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");

      const wscols = [
        { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
        { wch: 18 }, { wch: 15 }, { wch: 50 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
        { wch: 15 }, { wch: 15 }
      ];
      ws['!cols'] = wscols;

      const dateStr = new Date().toISOString().split('T')[0];
      let filename = `bookings_${dateStr}`;
      
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
      console.error('Error generating Excel report:', error);
      toast.error('Failed to generate Excel report: ' + error.message, { autoClose: 2000 });
    } finally {
      setIsDownloading(false);
    }
  };

  const renderCarInfo = (booking) => {
    if (booking.carReplacementHistory && booking.carReplacementHistory.length > 0) {
      return (
        <>
          <div>
            <strong>Current Car:</strong> {booking.car?.carName || 'N/A'}
            {getReplacementBadge(booking)}
          </div>
        </>
      );
    }
    return <div>{booking.car?.carName || 'N/A'}</div>;
  };

  const renderCarModel = (booking) => {
    if (booking.carReplacementHistory && booking.carReplacementHistory.length > 0) {
      return (
        <>
          <div>{booking.car?.model || 'N/A'}</div>
        </>
      );
    }
    return <div>{booking.car?.model || 'N/A'}</div>;
  };

  const renderExtensions = (booking) => {
    const extensions = booking.extensions || [];
    if (extensions.length === 0) {
      return <Badge bg="secondary">No Extensions</Badge>;
    }
    
    return (
      <div>
        <Badge bg="info">{extensions.length} Extension{extensions.length > 1 ? 's' : ''}</Badge>
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 ms-2"
          onClick={() => handleViewExtensions(booking)}
        >
          View Details
        </Button>
      </div>
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterField("name");
    setRentalStartDateFilter("");
    setRentalEndDateFilter("");
    setCreatedDateFilter("");
    fetchBookings(1);
  };

  return (
    <div className="container-fluid mt-4 px-3 px-md-4">
      <ToastContainer position="top-right" autoClose={2000} />
      
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="mb-0">Bookings Management</h2>
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
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="pickuplocation">Pickup Location</option>
                <option value="status">Status</option>
                <option value="paymentstatus">Payment Status</option>
                {/* <option value="rentalstartdate">Rental Start Date</option>
                <option value="rentalenddate">Rental End Date</option>
                <option value="createdat">Booking Created Date</option>
                <option value="replaced">Car Replacements</option>
                <option value="extensions">Extensions</option> */}
              </Form.Select>
            </Col>
            
            <Col xs={12} md={3}>
              <Form.Label className="fw-semibold">Search Value</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder={`Search by ${filterField === 'id' ? 'Booking ID'
                    : filterField === 'name' ? 'Name'
                      : filterField === 'email' ? 'Email'
                        : filterField === 'pickuplocation' ? 'Pickup Location'
                          : filterField === 'status' ? 'Status'
                            : filterField === 'paymentstatus' ? 'Payment Status'
                              : filterField === 'replaced' ? 'Yes/No'
                                : filterField === 'extensions' ? 'Extended/Not Extended'
                                : 'value'}`}
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
                <p className="mt-2">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">No bookings found matching your criteria.</p>
              </div>
            ) : (
              <Table bordered hover responsive className="mb-0">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
                  <tr className="table-header">
                    <th style={{ minWidth: '60px' }}>S.NO</th>
                    <th style={{ minWidth: '100px' }}>Booking ID</th>
                    <th style={{ minWidth: '120px' }}>Name</th>
                    <th style={{ minWidth: '180px' }}>Email</th>
                    <th style={{ minWidth: '140px' }}>Car</th>
                    <th style={{ minWidth: '120px' }}>Model</th>
                    <th style={{ minWidth: '100px' }}>Replaced</th>
                    <th style={{ minWidth: '120px' }}>Extensions</th>
                    <th style={{ minWidth: '120px' }}>Rental Start Date</th>
                    <th style={{ minWidth: '120px' }}>Rental End Date</th>
                    <th style={{ minWidth: '120px' }}>Booking Created Date</th>
                    <th style={{ minWidth: '100px' }}>Timings</th>
                    <th style={{ minWidth: '100px' }}>Total Price</th>
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
                  {filteredBookings.map((booking, index) => (
                    <tr key={booking._id} className={booking.carReplacementHistory && booking.carReplacementHistory.length > 0 ? 'table-info' : ''}>
                      <td className="text-center">{((pagination.currentPage - 1) * bookingsPerPage) + index + 1}</td>
                      <td className="align-middle">{booking._id?.slice(-8) || 'N/A'}</td>
                      <td className="align-middle">{booking.userId?.name || 'N/A'}</td>
                      <td className="align-middle">{booking.userId?.email || 'N/A'}</td>
                      <td className="align-middle">{renderCarInfo(booking)}</td>
                      <td className="align-middle">{renderCarModel(booking)}</td>
                      <td className="align-middle">{getReplacementStatus(booking)}</td>
                      <td className="align-middle">{renderExtensions(booking)}</td>
                      <td className="align-middle">{booking.rentalStartDate ? new Date(booking.rentalStartDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="align-middle">{booking.rentalEndDate ? new Date(booking.rentalEndDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="align-middle">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="align-middle">{booking.from || 'N/A'} - {booking.to || 'N/A'}</td>
                      <td className="align-middle">₹{booking.totalPrice || '0'}</td>
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
                  ))}
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

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={selectedBooking.status}
                  onChange={(e) => setSelectedBooking({ ...selectedBooking, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Payment Status</Form.Label>
                <Form.Select
                  value={selectedBooking.paymentStatus}
                  onChange={(e) => setSelectedBooking({ ...selectedBooking, paymentStatus: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Payment Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  value={selectedBooking.editedAmount}
                  onChange={(e) => setSelectedBooking({ ...selectedBooking, editedAmount: e.target.value })}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Extend Booking Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Extend Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <div className="mb-3">
                <p><strong>Booking ID:</strong> {selectedBooking._id}</p>
                <p><strong>User:</strong> {selectedBooking.userId?.name} ({selectedBooking.userId?.email})</p>
                <p><strong>Current End:</strong> {new Date(selectedBooking.rentalEndDate).toLocaleDateString()} {selectedBooking.to}</p>
                {selectedBooking.extensions && selectedBooking.extensions.length > 0 && (
                  <div className="alert alert-info">
                    <strong>Previous Extensions:</strong> {selectedBooking.extensions.length}
                  </div>
                )}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Extension Hours</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter hours to extend (optional)"
                  value={extensionData.hours}
                  onChange={(e) => setExtensionData({ ...extensionData, hours: e.target.value })}
                  min="1"
                  step="1"
                />
                <Form.Text className="text-muted">
                  Enter hours OR specify date/time below
                </Form.Text>
              </Form.Group>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Extended Delivery Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={extensionData.extendDeliveryDate}
                      onChange={(e) => setExtensionData({ ...extensionData, extendDeliveryDate: e.target.value })}
                      min={selectedBooking.rentalEndDate}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Extended Delivery Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={extensionData.extendDeliveryTime}
                      onChange={(e) => setExtensionData({ ...extensionData, extendDeliveryTime: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Extension Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter amount"
                  value={extensionData.amount}
                  onChange={(e) => setExtensionData({ ...extensionData, amount: e.target.value })}
                  required
                  min="1"
                  step="0.01"
                />
                <Form.Text className="text-muted">
                  Payment will be processed via Razorpay
                </Form.Text>
              </Form.Group>

              <div className="alert alert-info">
                <small>
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> 
                  <ul className="mb-0 mt-1">
                    <li>Provide either hours OR date/time for extension</li>
                    <li>Razorpay payment gateway will open for payment</li>
                    <li>Extension will be applied after successful payment</li>
                  </ul>
                </small>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtendModal(false)} disabled={isProcessingPayment}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={initRazorpayPayment}
            disabled={isProcessingPayment || !extensionData.amount}
          >
            {isProcessingPayment ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <i className="fas fa-credit-card me-2"></i>
                Pay & Extend Booking
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Replace Car Modal */}
      <Modal show={showReplaceModal} onHide={() => setShowReplaceModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Replace Car in Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <Form>
              <div className="mb-3">
                <p><strong>Booking ID:</strong> {selectedBooking._id}</p>
                <p><strong>User:</strong> {selectedBooking.userId?.name} ({selectedBooking.userId?.email})</p>
                <p><strong>Current Car:</strong> {selectedBooking.car?.carName} ({selectedBooking.car?.model})</p>
                <p><strong>Vehicle Number:</strong> {selectedBooking.car?.vehicleNumber}</p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Select New Car</Form.Label>
                <Form.Select
                  value={replaceData.newCarId}
                  onChange={(e) => setReplaceData({ ...replaceData, newCarId: e.target.value })}
                  required
                >
                  <option value="">Select a car</option>
                  {cars.map((car) => (
                    <option key={car._id} value={car._id}>
                      {car.carName} - {car.model} - {car.vehicleNumber} - ₹{car.pricePerDay}/day
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Staff Refund Amount (Optional)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter staff refund amount"
                  value={replaceData.staffRefund}
                  onChange={(e) => setReplaceData({ 
                    ...replaceData, 
                    staffRefund: e.target.value,
                    requirePayment: e.target.value ? false : replaceData.requirePayment
                  })}
                  min="0"
                  step="0.01"
                />
                <Form.Text className="text-muted">
                  If staff needs to be refunded (no Razorpay payment required)
                </Form.Text>
              </Form.Group>

              {!replaceData.staffRefund && (
                <>
                  <Form.Check 
                    type="checkbox"
                    label="Require Customer Payment"
                    checked={replaceData.requirePayment}
                    onChange={(e) => setReplaceData({ ...replaceData, requirePayment: e.target.checked })}
                    className="mb-3"
                  />

                  {replaceData.requirePayment && (
                    <>
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Payment Amount (₹)</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="Enter amount"
                              value={replaceData.amount}
                              onChange={(e) => setReplaceData({ ...replaceData, amount: e.target.value })}
                              required={replaceData.requirePayment}
                              min="1"
                              step="0.01"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Transaction ID</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Will be filled by Razorpay"
                              value={replaceData.transactionId}
                              readOnly
                              className="bg-light"
                            />
                            <Form.Text className="text-muted">
                              Will be auto-filled after payment
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <div className="alert alert-info">
                        <small>
                          <i className="fas fa-info-circle me-2"></i>
                          <strong>Note:</strong> Click "Pay & Replace Car" to open Razorpay payment gateway. 
                          Transaction ID will be automatically captured.
                        </small>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="alert alert-warning">
                <small>
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Important:</strong> 
                  <ul className="mb-0 mt-1">
                    <li>If staff refund is entered, no Razorpay payment is required</li>
                    <li>If no staff refund and payment is required, Razorpay will open</li>
                    <li>New car must be available during the booking period</li>
                  </ul>
                </small>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReplaceModal(false)} disabled={isReplacingCar || isProcessingPayment}>
            Cancel
          </Button>
          
          {replaceData.staffRefund ? (
            <Button 
              variant="warning" 
              onClick={handleReplaceCar}
              disabled={isReplacingCar || !replaceData.newCarId}
            >
              {isReplacingCar ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Replacing Car...
                </>
              ) : (
                <>
                  <i className="fas fa-exchange-alt me-2"></i>
                  Replace Car (Staff Refund)
                </>
              )}
            </Button>
          ) : (
            !replaceData.requirePayment ? (
              <Button 
                variant="warning" 
                onClick={handleReplaceCar}
                disabled={isReplacingCar || !replaceData.newCarId}
              >
                {isReplacingCar ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Replacing Car...
                  </>
                ) : (
                  <>
                    <i className="fas fa-exchange-alt me-2"></i>
                    Replace Car (No Payment)
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="success" 
                onClick={initReplaceCarPayment}
                disabled={isProcessingPayment || !replaceData.newCarId || !replaceData.amount}
              >
                {isProcessingPayment ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <i className="fas fa-credit-card me-2"></i>
                    Pay & Replace Car
                  </>
                )}
              </Button>
            )
          )}
        </Modal.Footer>
      </Modal>

      {/* View Extensions Modal */}
      <Modal show={showExtensionsModal} onHide={() => setShowExtensionsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Booking Extensions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <>
              <div className="mb-3">
                <h6>Booking Information</h6>
                <p><strong>Booking ID:</strong> {selectedBooking._id}</p>
                <p><strong>User:</strong> {selectedBooking.userId?.name} ({selectedBooking.userId?.email})</p>
                <p><strong>Current Car:</strong> {selectedBooking.car?.carName} ({selectedBooking.car?.model})</p>
                <p><strong>Original Rental End:</strong> {new Date(selectedBooking.rentalEndDate).toLocaleDateString()} {selectedBooking.to}</p>
              </div>
              
              <hr />
              
              <h6>Extension History</h6>
              {selectedBooking.extensions && selectedBooking.extensions.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Extended Date</th>
                      <th>Extended Time</th>
                      <th>Hours</th>
                      <th>Amount (₹)</th>
                      <th>Transaction ID</th>
                      <th>Extended At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking.extensions.map((ext, index) => (
                      <tr key={ext._id || index}>
                        <td>{index + 1}</td>
                        <td>{ext.extendDeliveryDate || '-'}</td>
                        <td>{ext.extendDeliveryTime || '-'}</td>
                        <td>{ext.hours || '-'}</td>
                        <td>₹{ext.amount || 0}</td>
                        <td>
                          {ext.transactionId ? (
                            <Badge bg="info" className="text-wrap">{ext.transactionId}</Badge>
                          ) : '-'}
                        </td>
                        <td>{ext.extendedAt ? new Date(ext.extendedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-info">
                      <td colSpan="4" className="text-end"><strong>Total:</strong></td>
                      <td><strong>₹{selectedBooking.extensions.reduce((sum, ext) => sum + (ext.amount || 0), 0)}</strong></td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </Table>
              ) : (
                <p className="text-muted">No extensions found for this booking.</p>
              )}
              
              {selectedBooking.extensions && selectedBooking.extensions.length > 0 && (
                <div className="alert alert-info mt-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Total Extensions:</strong> {selectedBooking.extensions.length} | 
                  <strong> Total Amount:</strong> ₹{selectedBooking.extensions.reduce((sum, ext) => sum + (ext.amount || 0), 0)}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtensionsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Booking Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bookingDetails && (
            <div className="row">
              <div className="col-md-6">
                <h5 className="text-primary">User Information</h5>
                <div className="mb-3">
                  <p><strong>Name:</strong> {bookingDetails.userId?.name || 'N/A'}</p>
                  <p><strong>Email:</strong> {bookingDetails.userId?.email || 'N/A'}</p>
                  <p><strong>Mobile:</strong> {bookingDetails.userId?.mobile || 'N/A'}</p>
                </div>

                <h5 className="mt-4 text-primary">Document Status</h5>
                <div className="mb-3">
                  <p>
                    <strong>Aadhar Card:</strong>
                    <Badge bg={
                      bookingDetails.userId?.documents?.aadharCard?.status === 'approved'
                        ? 'success'
                        : bookingDetails.userId?.documents?.aadharCard?.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    } className="ms-2">
                      {bookingDetails.userId?.documents?.aadharCard?.status || 'Not uploaded'}
                    </Badge>
                  </p>
                  <p>
                    <strong>Driving License:</strong>
                    <Badge bg={
                      bookingDetails.userId?.documents?.drivingLicense?.status === 'approved'
                        ? 'success'
                        : bookingDetails.userId?.documents?.drivingLicense?.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    } className="ms-2">
                      {bookingDetails.userId?.documents?.drivingLicense?.status || 'Not uploaded'}
                    </Badge>
                  </p>
                </div>

                <h5 className="mt-4 text-primary">Document Images</h5>
                <div className="mb-3">
                  {bookingDetails.userId?.documents?.aadharCard?.url && (
                    <div className="mb-3">
                      <h6>Aadhar Card</h6>
                      <img
                        src={bookingDetails.userId.documents.aadharCard.url}
                        alt="Aadhar Card"
                        className="img-fluid img-thumbnail"
                        style={{ maxHeight: '200px' }}
                      />
                      <p className="text-muted small mt-1">
                        Uploaded: {new Date(bookingDetails.userId.documents.aadharCard.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {bookingDetails.userId?.documents?.drivingLicense?.url && (
                    <div className="mb-3">
                      <h6>Driving License</h6>
                      <img
                        src={bookingDetails.userId.documents.drivingLicense.url}
                        alt="Driving License"
                        className="img-fluid img-thumbnail"
                        style={{ maxHeight: '200px' }}
                      />
                      <p className="text-muted small mt-1">
                        Uploaded: {new Date(bookingDetails.userId.documents.drivingLicense.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <h5 className="text-primary">Booking Information</h5>
                <div className="mb-3">
                  <p><strong>Booking ID:</strong> {bookingDetails._id}</p>
                  <p><strong>Status:</strong>
                    <Badge bg={getStatusBadge(bookingDetails.status)} className="ms-2">
                      {bookingDetails.status}
                    </Badge>
                  </p>
                  <p><strong>Payment Status:</strong>
                    <Badge bg={getPaymentBadge(bookingDetails.paymentStatus)} className="ms-2">
                      {bookingDetails.paymentStatus}
                    </Badge>
                  </p>
                  <p><strong>Transaction ID:</strong> {bookingDetails.transactionId || 'N/A'}</p>
                  <p><strong>Advance Paid:</strong> {bookingDetails.advancePaidStatus ? 'Yes' : 'No'}</p>
                </div>

                <h5 className="mt-4 text-primary">Rental Details</h5>
                <div className="mb-3">
                  <p><strong>Rental Start Date:</strong> {new Date(bookingDetails.rentalStartDate).toLocaleDateString()}</p>
                  <p><strong>Rental End Date:</strong> {new Date(bookingDetails.rentalEndDate).toLocaleDateString()}</p>
                  <p><strong>Timings:</strong> {bookingDetails.from} - {bookingDetails.to}</p>
                  <p><strong>Total Price:</strong> ₹{bookingDetails.totalPrice}</p>
                  <p><strong>Pickup Location:</strong> {bookingDetails.pickupLocation || 'N/A'}</p>
                  <p><strong>Deposit Type:</strong> {bookingDetails.deposit}</p>
                  <p><strong>OTP:</strong> {bookingDetails.otp || 'N/A'}</p>
                  <p><strong>Return OTP:</strong> {bookingDetails.returnOTP || 'Not generated'}</p>
                </div>

                <h5 className="mt-4 text-primary">Current Car Information</h5>
                <div className="mb-3">
                  <p><strong>Name:</strong> {bookingDetails.car?.carName}</p>
                  <p><strong>Model:</strong> {bookingDetails.car?.model}</p>
                  <p><strong>Year:</strong> {bookingDetails.car?.year}</p>
                  <p><strong>Vehicle Number:</strong> {bookingDetails.car?.vehicleNumber}</p>
                  <p><strong>Type:</strong> {bookingDetails.car?.type}</p>
                  <p><strong>Fuel:</strong> {bookingDetails.car?.fuel}</p>
                  <p><strong>Seats:</strong> {bookingDetails.car?.seats}</p>
                </div>
              </div>
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

export default Bookings;
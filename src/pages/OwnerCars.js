import { useState, useEffect } from "react";

const OwnerCars = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [formData, setFormData] = useState({
    status: "active",
    pricePerHour: "",
    pricePerDay: "",
    delayPerHour: "",
    delayPerDay: "",
    extendedPricePerHour: "",
    extendedPricePerDay: "",
    ownerCommision: "",
  });

  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://varahibackend.varahiselfdrivecars.com/api/car/owner-cars"
      );
      if (!res.ok) throw new Error("Failed to fetch cars");
      const data = await res.json();
      const pending = (data.cars || []).filter((c) => c.status === "pending");
      setCars(pending);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const openModal = (car) => {
    setSelectedCar(car);
    setFormData({
      status: "active",
      pricePerHour: car.pricePerHour || "",
      pricePerDay: car.pricePerDay || "",
      delayPerHour: car.delayPerHour || "",
      delayPerDay: car.delayPerDay || "",
      extendedPricePerHour: car.extendedPrice?.perHour || "",
      extendedPricePerDay: car.extendedPrice?.perDay || "",
      ownerCommision: car.ownerCommision || "",
    });
    setSuccessMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCar(null);
    setSuccessMsg("");
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCar) return;
    setSubmitting(true);
    setSuccessMsg("");
    try {
      const payload = {
        status: formData.status,
        pricePerHour: Number(formData.pricePerHour),
        pricePerDay: Number(formData.pricePerDay),
        delayPerHour: Number(formData.delayPerHour),
        delayPerDay: Number(formData.delayPerDay),
        extendedPrice: {
          perHour: Number(formData.extendedPricePerHour),
          perDay: Number(formData.extendedPricePerDay),
        },
        ownerCommision: Number(formData.ownerCommision),
      };
      const res = await fetch(
        `https://varahibackend.varahiselfdrivecars.com/api/admin/update-status/${selectedCar._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to update car status");
      setSuccessMsg("Car status updated successfully!");
      await fetchCars();
      setTimeout(() => closeModal(), 1500);
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: "success",
      pending: "warning",
      inactive: "secondary",
    };
    return (
      <span className={`badge bg-${map[status] || "secondary"} text-dark`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="container-fluid py-4 px-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-0" style={{ color: "#1a1a2e" }}>
            <i className="bi bi-car-front-fill me-2 text-warning"></i>
            Pending Cars
          </h2>
          <p className="text-muted small mb-0">
            Review and approve owner car submissions
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchCars}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-2">Fetching pending cars...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && cars.length === 0 && !error && (
        <div className="text-center py-5">
          <i
            className="bi bi-car-front text-muted"
            style={{ fontSize: "3rem" }}
          ></i>
          <p className="text-muted mt-3 fs-5">No pending cars found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && cars.length > 0 && (
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>Car</th>
                    <th>Owner</th>
                    <th>Vehicle No.</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Fuel</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th>Premium</th>
                    {/* <th>Live</th> */}
                    <th className="text-center pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car, index) => (
                    <tr key={car._id}>
                      <td className="ps-4 text-muted small">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {car.carImage?.[0] ? (
                            <img
                              src={car.carImage[0]}
                              alt={car.carName}
                              className="rounded"
                              style={{
                                width: 52,
                                height: 38,
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://via.placeholder.com/52x38?text=Car";
                              }}
                            />
                          ) : (
                            <div
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ width: 52, height: 38 }}
                            >
                              <i className="bi bi-car-front text-muted"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-semibold" style={{ fontSize: 14 }}>
                              {car.carName}
                            </div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {car.model} · {car.year}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>
                          <div className="fw-medium">{car.ownerId?.fullName}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {car.ownerId?.email}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: 12 }}>
                          {car.vehicleNumber}
                        </span>
                      </td>
                      <td>
                        <i className="bi bi-geo-alt-fill text-danger me-1" style={{ fontSize: 11 }}></i>
                        <span style={{ fontSize: 13 }}>{car.location}</span>
                      </td>
                      <td>
                        <span className="badge bg-info bg-opacity-10 text-info border border-info" style={{ fontSize: 12 }}>
                          {car.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{car.fuel}</td>
                      <td style={{ fontSize: 13 }}>
                        <i className="bi bi-people-fill me-1 text-muted"></i>
                        {car.seats}
                      </td>
                      <td>{statusBadge(car.status)}</td>
                      <td>
                        {car.isPremium ? (
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-star-fill me-1"></i>Premium
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border">Standard</span>
                        )}
                      </td>
                      {/* <td>
                        {car.isLive ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success">
                            <i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }}></i>Live
                          </span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-10 text-secondary border">
                            Offline
                          </span>
                        )}
                      </td> */}
                      <td className="text-center pe-4">
                        <button
                          className="btn btn-sm btn-warning fw-semibold px-3"
                          onClick={() => openModal(car)}
                        >
                          <i className="bi bi-pencil-fill me-1"></i>
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer bg-white border-top-0 text-muted small px-4 py-2">
            Showing {cars.length} pending car{cars.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showModal && selectedCar && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={closeModal}
          ></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050 }}
            role="dialog"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div
                  className="modal-header border-0 pb-0 px-4 pt-4"
                  style={{ background: "#1a1a2e" }}
                >
                  <div>
                    <h5 className="modal-title text-white fw-bold mb-0">
                      <i className="bi bi-sliders me-2 text-warning"></i>
                      Update Car Status &amp; Pricing
                    </h5>
                    <p className="text-white-50 small mb-0 mt-1">
                      {selectedCar.carName} · {selectedCar.model} ·{" "}
                      {selectedCar.vehicleNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={closeModal}
                  ></button>
                </div>

                <div className="modal-body px-4 py-4">
                  {successMsg && (
                    <div className="alert alert-success d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      {successMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} id="updateCarForm">
                    {/* Status */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold text-muted small text-uppercase ls-1">
                        Status
                      </label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status}
                        onChange={handleChange}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="onHold">On Hold</option>
                        <option value="underRepair">Under Repair</option>
                      </select>
                    </div>

                    <div className="row g-3 mb-3">
                      {/* Price Per Hour */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">
                          Price Per Hour (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="pricePerHour"
                            className="form-control"
                            placeholder="e.g. 120"
                            value={formData.pricePerHour}
                            onChange={handleChange}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      {/* Price Per Day */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">
                          Price Per Day (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="pricePerDay"
                            className="form-control"
                            placeholder="e.g. 2400"
                            value={formData.pricePerDay}
                            onChange={handleChange}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      {/* Delay Per Hour */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">
                          Delay Per Hour (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="delayPerHour"
                            className="form-control"
                            placeholder="e.g. 150"
                            value={formData.delayPerHour}
                            onChange={handleChange}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      {/* Delay Per Day */}
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">
                          Delay Per Day (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="delayPerDay"
                            className="form-control"
                            placeholder="e.g. 3000"
                            value={formData.delayPerDay}
                            onChange={handleChange}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extended Price */}
                    <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                      <div className="fw-semibold small text-muted text-uppercase mb-2">
                        <i className="bi bi-graph-up me-1"></i>Extended Price
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small">Per Hour (₹)</label>
                          <div className="input-group">
                            <span className="input-group-text">₹</span>
                            <input
                              type="number"
                              name="extendedPricePerHour"
                              className="form-control"
                              placeholder="e.g. 100"
                              value={formData.extendedPricePerHour}
                              onChange={handleChange}
                              min="0"
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small">Per Day (₹)</label>
                          <div className="input-group">
                            <span className="input-group-text">₹</span>
                            <input
                              type="number"
                              name="extendedPricePerDay"
                              className="form-control"
                              placeholder="e.g. 180"
                              value={formData.extendedPricePerDay}
                              onChange={handleChange}
                              min="0"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Owner Commission */}
                    <div className="mb-2">
                      <label className="form-label fw-semibold small">
                        Owner Commission (%)
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="ownerCommision"
                          className="form-control"
                          placeholder="e.g. 15"
                          value={formData.ownerCommision}
                          onChange={handleChange}
                          min="0"
                          max="100"
                          required
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="updateCarForm"
                    className="btn btn-warning fw-bold px-4"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i>
                        Update Car
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerCars;
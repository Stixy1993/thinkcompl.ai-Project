"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiCog, HiExclamationCircle, HiX, HiCheck } from "react-icons/hi";
import { useAuth } from "../../../lib/hooks/useAuth";
import { getUserProfile, UserProfile, getEquipment, saveEquipment, deleteEquipment, Equipment } from "../../../lib/firebase/firebaseUtils";
import Combobox from "../../../components/Combobox";

export default function CalibrationLicensesPage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState({
    equipmentType: "",
    manufacturer: "",
    serialNumber: "",
    calibrationTestDate: "",
    calibrationReTestDate: "",
    notes: ""
  });
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    equipmentType: "",
    manufacturer: "",
    serialNumber: "",
    calibrationTestDate: "",
    calibrationReTestDate: ""
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [isDeletingEquipment, setIsDeletingEquipment] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const [profile, equipmentData] = await Promise.all([
          getUserProfile(),
          getEquipment()
        ]);
        setUserProfile(profile);
        setEquipment(equipmentData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (isLoading) {
    return (
      <motion.div 
        className="flex-1 flex flex-col h-full bg-blue-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            className="text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <svg className="animate-spin h-16 w-16 text-white mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-8 h-8 bg-blue-400 rounded-full"></div>
              </motion.div>
            </div>
            <motion.p 
              className="text-white text-xl font-medium mb-2"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading Profile Data
            </motion.p>
            <p className="text-blue-100 text-sm">Retrieving your information from the database...</p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Function to handle equipment form changes
  const handleEquipmentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEquipmentForm(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field when user starts typing
    setValidationErrors(prev => ({ ...prev, [name]: "" }));
    
    // Validate dates in real-time
    if (name === "calibrationTestDate" || name === "calibrationReTestDate") {
      validateDateField(name, value);
    }
    
    // Suggest re-test date when test date is selected
    if (name === "calibrationTestDate" && value) {
      suggestReTestDate(value);
    }
  };

  // Function to handle combobox equipment type changes
  const handleEquipmentTypeChange = (value: string) => {
    setEquipmentForm(prev => ({ ...prev, equipmentType: value }));
    setValidationErrors(prev => ({ ...prev, equipmentType: "" }));
  };

  // Function to validate date fields
  const validateDateField = (fieldName: string, value: string) => {
    if (!value) return;
    
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only validate future dates for calibration test date, not re-test date
    if (fieldName === "calibrationTestDate" && date > today) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: "Cannot set to future dates"
      }));
    } else if (fieldName === "calibrationTestDate") {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: ""
      }));
    }
    
    // Validate re-test date is after test date
    if (fieldName === "calibrationReTestDate" && equipmentForm.calibrationTestDate) {
      const testDate = new Date(equipmentForm.calibrationTestDate);
      if (date <= testDate) {
        setValidationErrors(prev => ({
          ...prev,
          calibrationReTestDate: "Re-test date must be after test date"
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          calibrationReTestDate: ""
        }));
      }
    }
  };

  // Function to suggest re-test date (365 days after test date)
  const suggestReTestDate = (testDate: string) => {
    if (!testDate) return;
    
    const testDateObj = new Date(testDate);
    const suggestedDate = new Date(testDateObj);
    suggestedDate.setDate(suggestedDate.getDate() + 365); // Add 365 days
    
    // Format as YYYY-MM-DD for date input
    const formattedDate = suggestedDate.toISOString().split('T')[0];
    
    setEquipmentForm(prev => ({
      ...prev,
      calibrationReTestDate: formattedDate
    }));
    
    // Clear any existing validation error for re-test date
    setValidationErrors(prev => ({
      ...prev,
      calibrationReTestDate: ""
    }));
  };

  // Function to handle delete equipment
  const handleDeleteEquipment = (equipment: Equipment) => {
    setEquipmentToDelete(equipment);
    setShowDeleteModal(true);
  };

  // Function to confirm delete equipment
  const confirmDeleteEquipment = async () => {
    if (!equipmentToDelete) return;

    setIsDeletingEquipment(true);
    try {
      await deleteEquipment(equipmentToDelete.id);
      
      // Reload equipment data
      const updatedEquipment = await getEquipment();
      setEquipment(updatedEquipment);
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setEquipmentToDelete(null);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert("Failed to delete equipment. Please try again.");
    } finally {
      setIsDeletingEquipment(false);
    }
  };

  // Function to validate equipment form
  const validateEquipmentForm = () => {
    const errors = {
      equipmentType: "",
      manufacturer: "",
      serialNumber: "",
      calibrationTestDate: "",
      calibrationReTestDate: ""
    };
    
    let hasErrors = false;
    
    // Check if all required fields are filled
    if (!equipmentForm.equipmentType.trim()) {
      errors.equipmentType = "Please select an Equipment Type";
      hasErrors = true;
    }
    if (!equipmentForm.manufacturer.trim()) {
      errors.manufacturer = "Please enter a Manufacturer";
      hasErrors = true;
    }
    if (!equipmentForm.serialNumber.trim()) {
      errors.serialNumber = "Please enter a Serial Number";
      hasErrors = true;
    }
    if (!equipmentForm.calibrationTestDate) {
      errors.calibrationTestDate = "Please enter a Calibration Test Date";
      hasErrors = true;
    }
    if (!equipmentForm.calibrationReTestDate) {
      errors.calibrationReTestDate = "Please enter a Calibration Re-Test Date";
      hasErrors = true;
    }

    // Check if calibration test date is not in the future
    if (equipmentForm.calibrationTestDate) {
      const testDate = new Date(equipmentForm.calibrationTestDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (testDate > today) {
        errors.calibrationTestDate = "Cannot set to future dates";
        hasErrors = true;
      }
    }

    // Note: Re-test date can be in the future (that's the point of scheduling future calibrations)

    // Check if re-test date is after test date
    if (equipmentForm.calibrationTestDate && equipmentForm.calibrationReTestDate) {
      const testDate = new Date(equipmentForm.calibrationTestDate);
      const reTestDate = new Date(equipmentForm.calibrationReTestDate);
      
      if (reTestDate <= testDate) {
        errors.calibrationReTestDate = "Re-test date must be after test date";
        hasErrors = true;
      }
    }

    setValidationErrors(errors);
    return !hasErrors;
  };

  // Function to save equipment data
  const handleSaveEquipment = async () => {
    if (!validateEquipmentForm()) {
      return;
    }

    setIsSavingEquipment(true);
    try {
      // Save equipment to Firebase
      const result = await saveEquipment({
        equipmentType: equipmentForm.equipmentType,
        manufacturer: equipmentForm.manufacturer,
        serialNumber: equipmentForm.serialNumber,
        calibrationTestDate: equipmentForm.calibrationTestDate,
        calibrationReTestDate: equipmentForm.calibrationReTestDate,
        notes: equipmentForm.notes
      });
      
      // Reload equipment data
      const updatedEquipment = await getEquipment();
      setEquipment(updatedEquipment);
      
      // Reset form and close modal
      setEquipmentForm({
        equipmentType: "",
        manufacturer: "",
        serialNumber: "",
        calibrationTestDate: "",
        calibrationReTestDate: "",
        notes: ""
      });
      setShowEquipmentModal(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert("Failed to save equipment. Please try again.");
    } finally {
      setIsSavingEquipment(false);
    }
  };

  // Equipment type options for the combobox
  const equipmentTypeOptions = [
    "Torque Wrench",
    "Multimeter", 
    "Insulation Resistance Tester",
    "Ohm Meter",
    "Multifunction Meter",
    "Pressure Gauge",
    "Temperature Sensor",
    "Flow Meter",
    "Level Sensor",
    "Vibration Analyzer",
    "Power Quality Analyzer",
    "Oscilloscope",
    "Signal Generator",
    "Network Analyzer",
    "Spectrum Analyzer"
  ];

  return (
    <motion.div 
      className="flex-1 flex flex-col h-full bg-blue-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 pt-1 pb-1">
        <div className="flex items-center gap-6 mb-4">
          <h1 className="text-2xl font-bold text-white">Equipment Calibration</h1>
        </div>

        {/* Equipment Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-4"
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <HiCog className="w-6 h-6 text-blue-600" />
              Equipment Calibration
            </h2>
            <div className="space-y-4">
              {equipment.length === 0 ? (
                <div className="text-center py-8">
                  <HiCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No Equipment Found</p>
                  <p className="text-gray-400 text-sm">Add your first piece of equipment to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((item) => {
                    // Calculate calibration status
                    const getCalibrationStatus = () => {
                      if (!item.calibrationReTestDate) {
                        return { 
                          status: 'unknown', 
                          icon: <HiExclamationCircle className="w-3 h-3 text-white" />, 
                          label: 'No Date Set', 
                          color: 'bg-gray-500' 
                        };
                      }
                      
                      const reTestDate = new Date(item.calibrationReTestDate);
                      const today = new Date();
                      const oneMonthFromNow = new Date();
                      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
                      
                      if (reTestDate < today) {
                        return { 
                          status: 'overdue', 
                          icon: <HiX className="w-3 h-3 text-white" />, 
                          label: 'Overdue', 
                          color: 'bg-red-500' 
                        };
                      } else if (reTestDate <= oneMonthFromNow) {
                        return { 
                          status: 'due-soon', 
                          icon: <HiExclamationCircle className="w-3 h-3 text-white" />, 
                          label: 'Due Soon', 
                          color: 'bg-orange-500' 
                        };
                      } else {
                        return { 
                          status: 'compliant', 
                          icon: <HiCheck className="w-3 h-3 text-white" />, 
                          label: 'In Compliance', 
                          color: 'bg-green-500' 
                        };
                      }
                    };
                    
                    const status = getCalibrationStatus();
                    
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow relative flex flex-col min-h-[200px]">
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteEquipment(item)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Delete Equipment"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                        
                        {/* Content Area */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-800">{item.equipmentType}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">Manufacturer: {item.manufacturer.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</p>
                          <p className="text-sm text-gray-600 mb-1">Serial: {item.serialNumber}</p>
                          {item.calibrationTestDate && (
                            <p className="text-sm text-gray-600 mb-1">Last Calibrated: {new Date(item.calibrationTestDate).toLocaleDateString()}</p>
                          )}
                          {item.calibrationReTestDate && (
                            <p className="text-sm text-gray-600 mb-2">Next Due: {new Date(item.calibrationReTestDate).toLocaleDateString()}</p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-500 mb-2 italic">&ldquo;{item.notes}&rdquo;</p>
                          )}
                        </div>
                        
                        {/* Status Section - Always at bottom */}
                        <div className="mt-auto pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Status:</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${status.color}`}>
                                {status.icon}
                              </div>
                              <span className={`text-sm font-medium ${
                                status.status === 'compliant' ? 'text-green-500' : 
                                status.status === 'overdue' ? 'text-red-600' :
                                status.status === 'due-soon' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}>{status.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setShowEquipmentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add New Equipment
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Add New Equipment</h3>
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Type *
                </label>
                <Combobox
                  value={equipmentForm.equipmentType}
                  onChange={handleEquipmentTypeChange}
                  options={equipmentTypeOptions}
                  placeholder="Select or type equipment type..."
                  error={validationErrors.equipmentType}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer *
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={equipmentForm.manufacturer}
                  onChange={handleEquipmentFormChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 capitalize ${
                    validationErrors.manufacturer ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter Manufacturer Name"
                  style={{ textTransform: 'capitalize' }}
                />
                {validationErrors.manufacturer && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.manufacturer}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number *
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={equipmentForm.serialNumber}
                  onChange={handleEquipmentFormChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 ${
                    validationErrors.serialNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter Serial Number"
                />
                {validationErrors.serialNumber && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.serialNumber}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calibration Test Date *
                </label>
                <input
                  type="date"
                  name="calibrationTestDate"
                  value={equipmentForm.calibrationTestDate}
                  onChange={handleEquipmentFormChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 ${
                    validationErrors.calibrationTestDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {validationErrors.calibrationTestDate && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.calibrationTestDate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calibration Re-Test Date *
                </label>
                <input
                  type="date"
                  name="calibrationReTestDate"
                  value={equipmentForm.calibrationReTestDate}
                  onChange={handleEquipmentFormChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 ${
                    validationErrors.calibrationReTestDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {validationErrors.calibrationReTestDate && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.calibrationReTestDate}</p>
                )}
                {equipmentForm.calibrationTestDate && !validationErrors.calibrationReTestDate && (
                  <p className="text-blue-600 text-xs mt-1">✓ Automatically suggested 1 year from test date</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={equipmentForm.notes}
                  onChange={handleEquipmentFormChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
                  placeholder="Additional Notes About The Equipment..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSavingEquipment}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEquipment}
                disabled={isSavingEquipment || !equipmentForm.equipmentType.trim() || !equipmentForm.manufacturer.trim() || !equipmentForm.serialNumber.trim() || !equipmentForm.calibrationTestDate || !equipmentForm.calibrationReTestDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEquipment ? "Saving..." : "Save Equipment"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && equipmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Delete Equipment</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this equipment?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-800">{equipmentToDelete.equipmentType}</p>
                <p className="text-sm text-gray-600">{equipmentToDelete.manufacturer} - {equipmentToDelete.serialNumber}</p>
              </div>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isDeletingEquipment}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEquipment}
                disabled={isDeletingEquipment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingEquipment ? "Deleting..." : "Delete Equipment"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

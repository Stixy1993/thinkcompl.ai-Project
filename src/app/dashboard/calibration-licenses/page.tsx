"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiCog, HiUserGroup, HiCheckCircle, HiExclamationCircle, HiX, HiCheck } from "react-icons/hi";
import { useAuth } from "../../../lib/hooks/useAuth";
import { getUserProfile, UserProfile, getEquipment, saveEquipment, deleteEquipment, Equipment } from "../../../lib/firebase/firebaseUtils";
import Image from "next/image";

export default function CalibrationLicensesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("licenses");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
  const [isSendingInvite, setIsSendingInvite] = useState(false);
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

  const tabs = [
    { id: "calibration", label: "Equipment Calibration", icon: HiCog },
    { id: "licenses", label: "Personnel Profiles", icon: HiUserGroup },
  ];

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

  // Use profile data if available, otherwise fall back to Google auth data
  const displayName = userProfile?.fullName || user?.displayName || "User";
  const company = userProfile?.company || "thinkcompl.ai";
  const position = userProfile?.position || "";
  const licenses = userProfile?.licenses || [];
  const certifications = userProfile?.certifications || [];

  // Function to handle invitation form changes
  const handleInviteFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInviteForm(prev => ({ ...prev, [name]: value }));
  };

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

  // Function to send invitation email
  const handleSendInvitation = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      alert("Please fill in both name and email address");
      return;
    }

    setIsSendingInvite(true);
    try {
      // Here you would typically call your backend API to send the invitation
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      // Reset form and close modal
      setInviteForm({ name: "", email: "" });
      setShowInviteModal(false);
      alert("Invitation sent successfully!");
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert("Failed to send invitation. Please try again.");
    } finally {
      setIsSendingInvite(false);
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

  // Function to check if all licenses and certifications are valid
  const checkAllValid = () => {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // Check licenses
    for (const license of licenses) {
      if (license.expiryDate && license.expiryDate.trim() !== '' && !license.expiryDateNotSpecified) {
        const [day, month, year] = license.expiryDate.split('/').map(Number);
        const expiry = new Date(year, month - 1, day);
        if (expiry < now) {
          return false; // Found an expired license
        }
      }
    }

    // Check certifications
    for (const certification of certifications) {
      if (certification.expiryDate && certification.expiryDate.trim() !== '' && !certification.expiryDateNotSpecified) {
        const [day, month, year] = certification.expiryDate.split('/').map(Number);
        const expiry = new Date(year, month - 1, day);
        if (expiry < now) {
          return false; // Found an expired certification
        }
      }
    }

    return true; // All are valid
  };

  const allValid = checkAllValid();

  return (
    <motion.div 
      className="flex-1 flex flex-col h-full bg-blue-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 pt-1 pb-1">
        <div className="flex items-center gap-6 mb-4">
          <h1 className="text-2xl font-bold text-white">Calibration & Licenses</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-blue-600 shadow-lg"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-4"
        >
          {activeTab === "calibration" && (
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
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow relative">
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteEquipment(item)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Delete Equipment"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                          
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
                          <div className="mt-3 pt-3 border-t border-gray-100">
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
          )}

          {activeTab === "licenses" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HiUserGroup className="w-6 h-6 text-blue-600" />
                Personnel Profiles
              </h2>
              
              {/* Simple Personnel Card */}
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between w-full">
                  {/* Photo and Name Group */}
                  <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                      <div className="relative">
                        <Image
                          src={user.photoURL}
                          alt="Profile"
                          width={48}
                          height={48}
                          className="rounded-full border-2 border-blue-200"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <HiUserGroup className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-gray-800">{displayName}</h3>
                  </div>
                  
                  {/* All other data spread across the remaining space */}
                  <div className="flex items-center justify-between flex-1 ml-8">
                    <span className="text-base font-medium text-blue-600">{company}</span>
                    <span className="text-base font-medium text-gray-600">{position || "Position not specified"}</span>
                    <span className="text-base text-gray-600">Employee ID: <span className="font-medium text-gray-900">{userProfile?.employeeId || "N/A"}</span></span>
                    <span className="text-base text-gray-600">Licenses: <span className="font-semibold text-gray-900">{licenses.length}</span>
                      {licenses.length > 0 && (
                        <>
                          {allValid ? (
                            <HiCheckCircle className="w-4 h-4 text-green-500 inline ml-1" />
                          ) : (
                            <HiExclamationCircle className="w-4 h-4 text-red-500 inline ml-1" />
                          )}
                          <span className={`text-xs font-medium ml-1 ${
                            allValid ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {allValid ? 'Valid' : 'Expired'}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-base text-gray-600">Certifications: <span className="font-semibold text-gray-900">{certifications.length}</span>
                      {certifications.length > 0 && (
                        <>
                          {allValid ? (
                            <HiCheckCircle className="w-4 h-4 text-green-500 inline ml-1" />
                          ) : (
                            <HiExclamationCircle className="w-4 h-4 text-red-500 inline ml-1" />
                          )}
                          <span className={`text-xs font-medium ml-1 ${
                            allValid ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {allValid ? 'Valid' : 'Expired'}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Personnel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Invite Personnel</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={inviteForm.name}
                  onChange={handleInviteFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={inviteForm.email}
                  onChange={handleInviteFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSendingInvite}
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={isSendingInvite || !inviteForm.name.trim() || !inviteForm.email.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingInvite ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                <select
                  name="equipmentType"
                  value={equipmentForm.equipmentType}
                  onChange={handleEquipmentFormChange}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 ${
                    validationErrors.equipmentType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select Equipment Type</option>
                  <option value="Torque Wrench">Torque Wrench</option>
                  <option value="Multimeter">Multimeter</option>
                  <option value="Insulation Resistance Tester">Insulation Resistance Tester</option>
                  <option value="Ohm Meter">Ohm Meter</option>
                  <option value="Multifunction Meter">Multifunction Meter</option>
                </select>
                {validationErrors.equipmentType && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.equipmentType}</p>
                )}
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
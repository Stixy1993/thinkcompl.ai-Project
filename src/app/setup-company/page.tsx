'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, BuildingOfficeIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';

interface CompanyData {
  // Basic Info
  name: string;
  logo?: File | null;
  industry: string;
  size: string;
  companyType: string;
  foundedYear: string;
  
  // Contact
  website: string;
  phone: string;
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Admin
  adminName: string;
  adminEmail: string;
  primaryContact: string;
}

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Construction',
  'Education',
  'Retail',
  'Other'
];

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

const companyTypes = [
  'Private Company',
  'Public Company',
  'Government',
  'Non-profit',
  'Startup'
];

export default function CompanySetup() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    logo: null,
    industry: '',
    size: '',
    companyType: '',
    foundedYear: '',
    website: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    adminName: '',
    adminEmail: '',
    primaryContact: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-populate admin details from authenticated user
  useEffect(() => {
    if (user && user.email) {
      console.log('Auto-populating admin details from authenticated user:', {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      });

      setCompanyData(prev => ({
        ...prev,
        adminName: user.displayName || user.email?.split('@')[0] || '',
        adminEmail: user.email || '',
        primaryContact: user.displayName || user.email?.split('@')[0] || ''
      }));
    }
  }, [user]);

  // Function to link authenticated user to team member record
  const linkAuthUserToTeamMember = async (authUserId: string, email: string, companyName: string) => {
    const companyId = companyName.toLowerCase().replace(/\s+/g, '-');
    const adminId = `admin-${companyId}`;
    
    try {
      const response = await fetch('/api/team-members/link-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMemberId: adminId,
          authUserId: authUserId,
          email: email,
          authProvider: user?.providerData?.[0]?.providerId || 'firebase'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to link auth user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error linking auth user to team member:', error);
      throw error;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    try {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        setCompanyData(prev => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof CompanyData] || {}),
            [child]: value
          }
        }));
      } else {
        setCompanyData(prev => ({
          ...prev,
          [field]: value
        }));
      }
    } catch (error) {
      console.error('Error updating company data:', error);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCompanyData(prev => ({ ...prev, logo: file }));
    }
  };

  // Validation functions for each step
  const isStep1Valid = () => {
    return companyData.name.trim() !== '' && 
           companyData.industry !== '' && 
           companyData.size !== '' &&
           companyData.foundedYear.trim() !== '';
  };

  const isStep2Valid = () => {
    return companyData.address.street.trim() !== '' &&
           companyData.address.city.trim() !== '' &&
           companyData.address.state.trim() !== '' &&
           companyData.address.zipCode.trim() !== '' &&
           companyData.address.country.trim() !== '';
  };

  const isStep3Valid = () => {
    return companyData.adminName.trim() !== '' &&
           companyData.adminEmail.trim() !== '' &&
           companyData.primaryContact.trim() !== '';
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1: return isStep1Valid();
      case 2: return isStep2Valid();
      case 3: return isStep3Valid();
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && isCurrentStepValid()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      Object.entries(companyData).forEach(([key, value]) => {
        if (key === 'address') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'logo' && value) {
          formData.append('logo', value);
        } else {
          formData.append(key, value as string);
        }
      });

      const response = await fetch('/api/company/profile', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log('Company profile created successfully');
        
        // Link the authenticated user to the admin team member record
        if (user && user.uid) {
          try {
            await linkAuthUserToTeamMember(user.uid, user.email || '', companyData.name);
            console.log('Auth user successfully linked to team member record');
          } catch (linkError) {
            console.error('Failed to link auth user to team member:', linkError);
            // Don't fail the entire process for this
          }
        }
        
        // Redirect back to dashboard to show progress
        router.push('/dashboard');
      } else {
        throw new Error('Failed to save company profile');
      }
    } catch (error) {
      console.error('Error saving company profile:', error);
      alert('Failed to save company profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Company Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry *
            </label>
            <select
              value={companyData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            >
              <option value="">Select Industry</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size *
            </label>
            <select
              value={companyData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            >
              <option value="">Select Size</option>
              {companySizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Type *
            </label>
            <select
              value={companyData.companyType}
              onChange={(e) => handleInputChange('companyType', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            >
              <option value="">Select Type</option>
              {companyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Founded Year
            </label>
            <input
              type="number"
              value={companyData.foundedYear}
              onChange={(e) => handleInputChange('foundedYear', e.target.value)}
              min="1800"
              max={new Date().getFullYear()}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={companyData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Logo
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {companyData.logo && (
            <div className="w-16 h-16 rounded-lg border-2 border-gray-300 overflow-hidden">
              <img
                src={URL.createObjectURL(companyData.logo)}
                alt="Company logo preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Company Address</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={companyData.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={companyData.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State/Province *
            </label>
            <input
              type="text"
              value={companyData.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP/Postal Code *
            </label>
            <input
              type="text"
              value={companyData.address.zipCode}
              onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <input
              type="text"
              value={companyData.address.country}
              onChange={(e) => handleInputChange('address.country', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={companyData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Administrative Contact</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Name *
            </label>
            <input
              type="text"
              value={companyData.adminName}
              onChange={(e) => handleInputChange('adminName', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email *
            </label>
            <input
              type="email"
              value={companyData.adminEmail}
              onChange={(e) => handleInputChange('adminEmail', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Contact Person
            </label>
            <input
              type="text"
              value={companyData.primaryContact}
              onChange={(e) => handleInputChange('primaryContact', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>
        </div>
      </div>


    </div>
  );

  return (
    <div className="min-h-screen bg-blue-400">
      {/* Header */}
      <header className="bg-blue-600 text-white fixed w-full z-50 shadow">
        <nav className="flex items-center px-8 py-2 relative">
          <div className="flex items-center gap-2">
            <Image src="/Compl.ai Logo sign in.svg" alt="Compl.ai Logo" width={32} height={32} />
            <span className="font-bold text-lg md:text-3xl leading-tight">thinkcompl.<span className="text-blue-200">ai</span></span>
          </div>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pt-24">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-3">
            Company Setup Wizard
          </h1>
          <p className="text-xl text-blue-100">
            Configure your company information in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-4">
          <div className="flex items-center mb-3">
            {/* Step 1 */}
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              0 < currentStep 
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                : 0 === currentStep - 1
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110'
                : 'bg-blue-300 border-blue-300 text-white'
            }`}>
              {0 < currentStep ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <BuildingOfficeIcon className="w-6 h-6" />
              )}
            </div>
            
            {/* Line 1 */}
            <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
              0 < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
            }`} />
            
            {/* Step 2 */}
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              1 < currentStep 
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                : 1 === currentStep - 1
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110'
                : 'bg-blue-300 border-blue-300 text-white'
            }`}>
              {1 < currentStep ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <MapPinIcon className="w-6 h-6" />
              )}
            </div>
            
            {/* Line 2 */}
            <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
              1 < currentStep - 1 ? 'bg-white' : 'bg-blue-300'
            }`} />
            
            {/* Step 3 */}
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
              2 < currentStep 
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110' 
                : 2 === currentStep - 1
                ? 'bg-white border-white text-blue-600 shadow-lg scale-110'
                : 'bg-blue-300 border-blue-300 text-white'
            }`}>
              {2 < currentStep ? (
                <CheckIcon className="w-6 h-6" />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {[
              { title: 'Basic Info', subtitle: 'Step 1' },
              { title: 'Address', subtitle: 'Step 2' },
              { title: 'Admin Contact', subtitle: 'Step 3' }
            ].map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center w-12">
                  <span className={`text-xs font-semibold text-center transition-all duration-300 whitespace-nowrap ${
                    index <= currentStep - 1 ? 'text-white' : 'text-blue-200'
                  }`}>
                    {step.title}
                  </span>
                  <span className={`text-xs text-center mt-1 transition-all duration-300 ${
                    index <= currentStep - 1 ? 'text-blue-100' : 'text-blue-300'
                  }`}>
                    {step.subtitle}
                  </span>
                </div>
                {index < 2 && (
                  <div className="flex-1 h-1 mx-3" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {currentStep === 1 && 'Basic Company Information'}
              {currentStep === 2 && 'Company Address'}  
              {currentStep === 3 && 'Administrative Contact'}
            </h2>
            <p className="text-blue-100">
              {currentStep === 1 && 'Tell us about your company'}
              {currentStep === 2 && 'Where is your company located?'}
              {currentStep === 3 && 'Who will be the main administrator?'}
            </p>
          </div>

          <div className="p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-8 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!isCurrentStepValid()}
                  className={`px-8 py-2 rounded transition-colors ${
                    isCurrentStepValid() 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isStep3Valid()}
                  className={`px-8 py-2 rounded transition-colors ${
                    isStep3Valid() && !isSubmitting
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Finish'}
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
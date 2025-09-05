import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, setDoc, getDoc, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Server-side Firebase initialization
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const storage = getStorage(app);

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    
    // Handle JSON logo-only updates (base64 upload)
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      console.log('Received JSON body for logo update');
      
      if (body.updateLogoOnly && body.logoBase64) {
        try {
          console.log('Uploading logo to Firebase Storage...');
          
          // Convert base64 to blob for Firebase Storage upload
          const base64Data = body.logoBase64.split(',')[1]; // Remove data:image/jpeg;base64,
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });

          // Generate unique filename
          const timestamp = Date.now();
          const filename = `company-logos/logo-${timestamp}.jpg`;
          
          // Upload to Firebase Storage
          const storageRef = ref(storage, filename);
          console.log('Uploading to storage path:', filename);
          const snapshot = await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          console.log('Logo uploaded to Firebase Storage:', downloadURL);

          // Update Firestore with Storage URL
          const companiesRef = collection(db, 'companies');
          const q = query(companiesRef, orderBy('updatedAt', 'desc'), limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const companyDoc = querySnapshot.docs[0];
            await setDoc(companyDoc.ref, { 
              logoUrl: downloadURL, // Store Firebase Storage URL
              updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log('Logo URL stored successfully in Firestore');
            return NextResponse.json({ 
              success: true, 
              message: 'Logo uploaded successfully to Firebase Storage',
              logoUrl: downloadURL
            });
          } else {
            return NextResponse.json({ error: 'No company profile found' }, { status: 404 });
          }
        } catch (uploadError) {
          console.error('Firebase Storage upload error:', uploadError);
          return NextResponse.json({ 
            error: 'Failed to upload logo to Firebase Storage',
            details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error' 
          }, { status: 500 });
        }
      }
      
      if (body.updateLogoOnly && body.logoUrl) {
        // Direct URL update (fallback)
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, orderBy('updatedAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const companyDoc = querySnapshot.docs[0];
          await setDoc(companyDoc.ref, { 
            logoUrl: body.logoUrl,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          console.log('Logo URL updated successfully:', body.logoUrl);
          return NextResponse.json({ 
            success: true, 
            message: 'Logo updated successfully',
            logoUrl: body.logoUrl
          });
        } else {
          return NextResponse.json({ error: 'No company profile found' }, { status: 404 });
        }
      }
    }
    
    // Handle FormData (original company setup)
    const formData = await request.formData();
    console.log('Received form data keys:', Array.from(formData.keys()));
    
    // Check if this is just a logo update
    const isLogoUpdate = formData.get('updateLogo') === 'true';
    
    if (isLogoUpdate) {
      // Handle logo-only update
      const logoFile = formData.get('logo') as File;
      console.log('Logo update requested:', logoFile ? `${logoFile.name} (${logoFile.size} bytes)` : 'No logo file');
      
      if (logoFile && logoFile.size > 0) {
        try {
          console.log('Logo update temporarily disabled for testing');
          // TODO: Re-enable logo upload after fixing Firebase Storage
          let logoUrl = null;
          
          // Update existing company with new logo
          const companiesRef = collection(db, 'companies');
          const q = query(companiesRef, limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const companyDoc = querySnapshot.docs[0];
            await setDoc(companyDoc.ref, { 
              logoUrl: logoUrl,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log('Logo updated successfully');
            return NextResponse.json({
              success: true,
              message: 'Logo updated successfully',
              logoUrl: logoUrl
            });
          } else {
            throw new Error('No company found to update');
          }
        } catch (logoError) {
          console.error('Error updating logo:', logoError);
          return NextResponse.json(
            { error: 'Failed to update logo' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No logo file provided' },
          { status: 400 }
        );
      }
    }
    
    // Extract company data for full profile creation
    const companyData: any = {
      name: formData.get('name'),
      industry: formData.get('industry'),
      size: formData.get('size'),
      companyType: formData.get('companyType'),
      foundedYear: formData.get('foundedYear'),
      website: formData.get('website'),
      phone: formData.get('phone'),
      address: JSON.parse(formData.get('address') as string || '{}'),
      adminName: formData.get('adminName'),
      adminEmail: formData.get('adminEmail'),
      primaryContact: formData.get('primaryContact'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Handle logo upload if provided
    const logoFile = formData.get('logo') as File;
    console.log('Logo file received:', logoFile ? `${logoFile.name} (${logoFile.size} bytes)` : 'No logo file');
    
    if (logoFile && logoFile.size > 0) {
      try {
        console.log('Uploading logo from setup wizard to Firebase Storage...');
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = logoFile.name.split('.').pop() || 'jpg';
        const filename = `company-logos/setup-logo-${timestamp}.${fileExtension}`;
        
        // Upload to Firebase Storage
        const storageRef = ref(storage, filename);
        console.log('Uploading to storage path:', filename);
        
        // Convert File to ArrayBuffer then to Uint8Array for upload
        const arrayBuffer = await logoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const snapshot = await uploadBytes(storageRef, uint8Array, {
          contentType: logoFile.type
        });
        const logoUrl = await getDownloadURL(snapshot.ref);
        
        console.log('Setup wizard logo uploaded to Firebase Storage:', logoUrl);
        
        // Add logo URL to company data
        companyData.logoUrl = logoUrl;
      } catch (logoError) {
        console.error('Failed to upload logo from setup wizard:', logoError);
        // Continue without logo - don't fail the entire setup
        console.log('Company setup will continue without logo - user can upload later');
      }
    }

    console.log('Company data to save:', companyData);

    // Save to Firestore - using company name as document ID for easy retrieval
    const companyId = companyData.name.toLowerCase().replace(/\s+/g, '-');
    const companyRef = doc(collection(db, 'companies'), companyId);
    await setDoc(companyRef, companyData);
    
    console.log('Company profile saved successfully to Firestore');

    // Create admin user in team hierarchy (linked to Firebase Auth user)
    const adminUserData = {
      id: `admin-${companyId}`,
      email: companyData.adminEmail,
      name: companyData.adminName,
      role: 'admin',
      status: 'active',
      position: 'Administrator', 
      department: 'Management',
      company: companyData.name,
      isCompanyAdmin: true,
      profileComplete: false, // Flag to prompt profile completion
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      // Link to Firebase Auth user for seamless integration
      authUserId: 'auto-populated-from-auth', // Will be updated by client-side logic
      authProvider: 'firebase', // Track authentication provider
      setupSource: 'company-wizard' // Track how this user was created
    };

    // Save admin user to team members collection
    const adminRef = doc(collection(db, 'team-members'), adminUserData.id);
    await setDoc(adminRef, adminUserData);
    
    console.log('Admin user created in team hierarchy');
    
    return NextResponse.json({
      success: true,
      message: 'Company profile saved successfully',
      companyId: companyRef.id
    });
  } catch (error) {
    console.error('Error saving company profile:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save company profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get company ID from query params or get the first company
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('id');
    
    if (companyId) {
      // Get specific company
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        return NextResponse.json({
          success: true,
          company: companySnap.data()
        });
      } else {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    } else {
      // Return the first company found (for single-company setups)
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const companyData = querySnapshot.docs[0].data();
        return NextResponse.json({
          success: true,
          company: companyData
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No company profile found'
        });
      }
    }
  } catch (error) {
    console.error('Error getting company profile:', error);
    return NextResponse.json(
      { error: 'Failed to get company profile' },
      { status: 500 }
    );
  }
}
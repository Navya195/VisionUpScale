/**
 * Authentication Context
 * ======================
 * Manages user authentication state and Firebase Auth integration.
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../utils/firebase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Mock auth: no persistence, always start logged out
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(true); // Always true when logged in
      setLoading(false);
    }, (err) => {
      console.error('Auth state change error:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Register new user with email and password
   */
  const register = useCallback(async (email, password, displayName) => {
    try {
      setError(null);
      
      if (!isFirebaseConfigured()) {
        const mockUser = {
          uid: 'mock-user-id-' + Date.now(),
          email: email,
          displayName: displayName || 'Navya',
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return { success: true, user: mockUser };
      }

      const auth = getFirebaseAuth();
      
      // Create user account
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(newUser, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(newUser);
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true, user: newUser };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      
      if (!isFirebaseConfigured()) {
        const mockUser = {
          uid: 'mock-user-id-' + Date.now(),
          email: email,
          displayName: 'Navya',
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return { success: true, user: mockUser };
      }

      const auth = getFirebaseAuth();
      
      const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);
      
      setUser(signedInUser);
      setIsAuthenticated(true);
      
      return { success: true, user: signedInUser };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign out current user
   */
  const logout = useCallback(async () => {
    try {
      setError(null);
      
      if (!isFirebaseConfigured()) {
        setUser(null);
        setIsAuthenticated(false);
        return { success: true };
      }

      const auth = getFirebaseAuth();
      
      await firebaseSignOut(auth);
      
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (email) => {
    try {
      setError(null);
      
      if (!isFirebaseConfigured()) {
        return { success: true };
      }

      const auth = getFirebaseAuth();
      
      await sendPasswordResetEmail(auth, email);
      
      return { success: true };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Update user profile
   */
  const updateUserProfile = useCallback(async (updates) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!isFirebaseConfigured()) {
        const updatedUser = { ...user };
        if (updates.displayName) updatedUser.displayName = updates.displayName;
        if (updates.photoURL) updatedUser.photoURL = updates.photoURL;
        if (updates.email) updatedUser.email = updates.email;
        setUser(updatedUser);
        return { success: true };
      }

      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      if (updates.displayName) {
        await updateProfile(currentUser, { displayName: updates.displayName });
      }
      
      if (updates.photoURL) {
        await updateProfile(currentUser, { photoURL: updates.photoURL });
      }
      
      if (updates.email && updates.email !== user.email) {
        await updateEmail(currentUser, updates.email);
      }
      
      // Refresh user
      setUser(currentUser);
      
      return { success: true };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  /**
   * Change user password
   */
  const changePassword = useCallback(async (newPassword) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!isFirebaseConfigured()) {
        return { success: true };
      }

      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      await updatePassword(currentUser, newPassword);
      
      return { success: true };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  /**
   * Delete user account
   */
  const deleteAccount = useCallback(async () => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!isFirebaseConfigured()) {
        setUser(null);
        setIsAuthenticated(false);
        return { success: true };
      }

      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      
      // Delete user account
      await currentUser.delete();
      
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (err) {
      const errorMessage = formatAuthError(err.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  /**
   * Format Firebase error messages
   */
  function formatAuthError(code) {
    const errorMap = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'User account has been disabled',
      'auth/user-not-found': 'User not found',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already in use',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    };
    
    return errorMap[code] || 'Authentication error. Please try again.';
  }

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    changePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

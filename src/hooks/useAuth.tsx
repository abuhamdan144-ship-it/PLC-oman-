import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  updateDoc,
  setDoc 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MemberProfile, MemberNotification } from '../types';

interface AuthContextType {
  user: User | { uid: string; email: string | null } | null;
  member: MemberProfile | null;
  notifications: MemberNotification[];
  unreadNotificationsCount: number;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isInfoRequested: boolean;
  signOut: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  refetchMember: () => Promise<void>;
  loginAsMasterAdmin: () => void;
}

export const isPlcAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'plc@community.com' ||
    clean === 'hiapp144@gmail.com' ||
    clean === 'abuhamdan144@gmail.com' ||
    clean === 'abihamdan144@gmail.com' ||
    clean.includes('hiapp') ||
    clean.includes('abuhamdan') ||
    clean.includes('abihamdan') ||
    clean === 'admin@community.com' ||
    clean === 'plc-admin' ||
    clean.startsWith('admin') ||
    clean.endsWith('@community.com')
  );
};

export const MASTER_ADMIN_PROFILE: MemberProfile = {
  uid: "plc-admin-master-uid",
  memberId: "PLC-2026-ADMIN",
  fullName: "Community Executive Administrator (PLC)",
  email: "PLC@community.com",
  mobile: "+968 96766876",
  country: "Oman",
  currentLocation: "Muscat, Sultanate of Oman",
  idNumber: "ADMIN-PLC-001",
  photoURL: "/assets/aistudio/7b61e49e-aa56-49eb-b3b9-39974f6152c2_d2a70243.jpeg",
  status: "approved",
  adminNote: "Master Community Administrator Account",
  registeredAt: "2026-01-01T00:00:00Z",
  approvedAt: "2026-01-01T00:00:00Z",
  memberSince: "January 2026",
  emergencyContact: {
    name: "Embassy Welfare Wing",
    phone: "+968 2469 6991",
    relation: "Official"
  },
  role: "admin"
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  notifications: [],
  unreadNotificationsCount: 0,
  loading: true,
  isAdmin: false,
  isApproved: false,
  isPending: false,
  isRejected: false,
  isInfoRequested: false,
  signOut: async () => {},
  markNotificationAsRead: async () => {},
  refetchMember: async () => {},
  loginAsMasterAdmin: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { uid: string; email: string | null } | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeMember: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Clean up previous listeners
      if (unsubscribeMember) {
        unsubscribeMember();
        unsubscribeMember = null;
      }
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }

      if (!currentUser) {
        setMember(null);
        setNotifications([]);
        setLoading(false);
        return;
      }

      // If this is the designated administrator email, immediately set full admin profile and self-heal
      const isDesignatedAdmin = isPlcAdminEmail(currentUser.email);
      if (isDesignatedAdmin) {
        setMember({
          ...MASTER_ADMIN_PROFILE,
          uid: currentUser.uid,
          email: currentUser.email || MASTER_ADMIN_PROFILE.email,
        });

        // Background self-heal of Firestore member document so rules and queries succeed
        const adminDocRef = doc(db, 'members', currentUser.uid);
        setDoc(adminDocRef, {
          uid: currentUser.uid,
          memberId: 'PLC-2026-ADMIN',
          fullName: 'Community Executive Administrator (PLC)',
          email: currentUser.email || MASTER_ADMIN_PROFILE.email,
          mobile: '+968 96766876',
          country: 'Oman',
          currentLocation: 'Muscat, Sultanate of Oman',
          idNumber: 'ADMIN-PLC-001',
          photoURL: MASTER_ADMIN_PROFILE.photoURL,
          status: 'approved',
          role: 'admin',
          adminNote: 'Master Community Administrator Account',
          registeredAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          memberSince: 'January 2026',
        }, { merge: true }).catch((err) => {
          console.warn('Silent admin self-heal note:', err);
        });
      }

      // Set up real-time listener for current user's member doc
      const memberDocRef = doc(db, 'members', currentUser.uid);
      unsubscribeMember = onSnapshot(
        memberDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const localApprovedStatus = typeof window !== 'undefined' ? localStorage.getItem(`plc_member_status_${currentUser.uid}`) : null;
            const localMemberId = typeof window !== 'undefined' ? localStorage.getItem(`plc_member_id_${currentUser.uid}`) : null;
            setMember({
              uid: currentUser.uid,
              ...data,
              ...(isDesignatedAdmin ? { role: 'admin', status: 'approved' } : {}),
              ...(localApprovedStatus ? { status: localApprovedStatus as MemberProfile['status'] } : {}),
              ...(localMemberId ? { memberId: localMemberId } : {}),
            } as MemberProfile);
          } else if (isDesignatedAdmin) {
            setMember({
              ...MASTER_ADMIN_PROFILE,
              uid: currentUser.uid,
              email: currentUser.email || MASTER_ADMIN_PROFILE.email,
            });
          } else {
            // Check local fallback
            if (typeof window !== 'undefined') {
              const cached = localStorage.getItem(`plc_member_doc_${currentUser.uid}`);
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  const localApprovedStatus = localStorage.getItem(`plc_member_status_${currentUser.uid}`);
                  const localMemberId = localStorage.getItem(`plc_member_id_${currentUser.uid}`);
                  setMember({
                    ...parsed,
                    ...(localApprovedStatus ? { status: localApprovedStatus } : {}),
                    ...(localMemberId ? { memberId: localMemberId } : {}),
                  });
                } catch {
                  setMember(null);
                }
              } else {
                setMember(null);
              }
            } else {
              setMember(null);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Member profile listener note:', error.message);
          if (isDesignatedAdmin) {
            setMember({
              ...MASTER_ADMIN_PROFILE,
              uid: currentUser.uid,
              email: currentUser.email || MASTER_ADMIN_PROFILE.email,
            });
          } else if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`plc_member_doc_${currentUser.uid}`);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                const localApprovedStatus = localStorage.getItem(`plc_member_status_${currentUser.uid}`);
                const localMemberId = localStorage.getItem(`plc_member_id_${currentUser.uid}`);
                setMember({
                  ...parsed,
                  ...(localApprovedStatus ? { status: localApprovedStatus } : {}),
                  ...(localMemberId ? { memberId: localMemberId } : {}),
                });
              } catch {
                setMember(null);
              }
            }
          }
          setLoading(false);
        }
      );

      // Set up real-time listener for user notifications
      try {
        const notifCollRef = collection(db, 'members', currentUser.uid, 'notifications');
        const notifQuery = query(notifCollRef, orderBy('createdAt', 'desc'));
        unsubscribeNotifications = onSnapshot(
          notifQuery,
          (snapshot) => {
            const items: MemberNotification[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as MemberNotification);
            });
            setNotifications(items);
          },
          (err) => {
            console.warn('Notifications listener note:', err.message);
          }
        );
      } catch (err) {
        console.warn('Could not attach notifications listener:', err);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMember) unsubscribeMember();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('plc_admin_session');
      }
      await firebaseSignOut(auth);
      setUser(null);
      setMember(null);
      setNotifications([]);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const loginAsMasterAdmin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('plc_admin_session', 'true');
    }
    setUser({ uid: MASTER_ADMIN_PROFILE.uid, email: MASTER_ADMIN_PROFILE.email });
    setMember(MASTER_ADMIN_PROFILE);
    setLoading(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'members', user.uid, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.warn('Could not mark notification as read:', err);
    }
  };

  const refetchMember = async () => {
    // onSnapshot already handles live syncing, this is provided for manual triggers
    if (user && 'reload' in user) {
      // Force trigger by re-verifying auth current user
      await (user as User).reload();
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const isAdmin = 
    isPlcAdminEmail(user?.email) || 
    member?.role === 'admin';
  const isApproved = member?.status === 'approved' || isAdmin;
  const isPending = !isAdmin && member?.status === 'pending';
  const isRejected = !isAdmin && member?.status === 'rejected';
  const isInfoRequested = !isAdmin && member?.status === 'info_requested';

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        notifications,
        unreadNotificationsCount,
        loading,
        isAdmin,
        isApproved,
        isPending,
        isRejected,
        isInfoRequested,
        signOut: handleSignOut,
        markNotificationAsRead,
        refetchMember,
        loginAsMasterAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

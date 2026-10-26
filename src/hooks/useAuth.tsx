import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MemberNotification, MemberProfile } from '../types';

interface AuthContextType {
  user: User | null;
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
}

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
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeMember: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeMember?.();
      unsubscribeNotifications?.();
      unsubscribeMember = undefined;
      unsubscribeNotifications = undefined;
      setUser(currentUser);
      setMember(null);
      setNotifications([]);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const memberRef = doc(db, 'members', currentUser.uid);
      unsubscribeMember = onSnapshot(
        memberRef,
        (snapshot) => {
          setMember(snapshot.exists() ? ({ uid: currentUser.uid, ...snapshot.data() } as MemberProfile) : null);
          setLoading(false);
        },
        (error) => {
          console.warn('Member profile listener note:', error.message);
          setMember(null);
          setLoading(false);
        },
      );

      const notificationsQuery = query(
        collection(db, 'members', currentUser.uid, 'notifications'),
        orderBy('createdAt', 'desc'),
      );
      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MemberNotification)));
        },
        (error) => console.warn('Notifications listener note:', error.message),
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMember?.();
      unsubscribeNotifications?.();
    };
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setMember(null);
    setNotifications([]);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'members', user.uid, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.warn('Could not mark notification as read:', error);
    }
  };

  const refetchMember = async () => {
    await user?.reload();
  };

  const isAdmin = member?.role === 'admin';
  const isApproved = member?.status === 'approved';
  const isPending = !isAdmin && member?.status === 'pending';
  const isRejected = !isAdmin && member?.status === 'rejected';
  const isInfoRequested = !isAdmin && member?.status === 'info_requested';

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        notifications,
        unreadNotificationsCount: notifications.filter((item) => !item.read).length,
        loading,
        isAdmin,
        isApproved,
        isPending,
        isRejected,
        isInfoRequested,
        signOut: handleSignOut,
        markNotificationAsRead,
        refetchMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

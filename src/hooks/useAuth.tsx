import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { MemberProfile, MemberNotification } from '../types';

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
    let unsubscribeMember: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setMember(null);
      setNotifications([]);
      setLoading(true);
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

      const memberDocRef = doc(db, 'members', currentUser.uid);
      unsubscribeMember = onSnapshot(
        memberDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setMember({ uid: currentUser.uid, ...snapshot.data() } as MemberProfile);
          } else {
            setMember(null);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Member profile listener note:', error.message);
          setLoading(false);
        },
      );

      const notificationsRef = collection(db, 'members', currentUser.uid, 'notifications');
      const notificationsQuery = query(notificationsRef, orderBy('createdAt', 'desc'));
      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const items = snapshot.docs.map((notification) => ({
            id: notification.id,
            ...notification.data(),
          }) as MemberNotification);
          setNotifications(items);
        },
        (error) => console.warn('Notifications listener note:', error.message),
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMember) unsubscribeMember();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setMember(null);
      setNotifications([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
    if (user) await user.reload();
  };

  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;
  const isAdmin = member?.role === 'admin';
  const isApproved = member?.status === 'approved';
  const isPending = member?.status === 'pending';
  const isRejected = member?.status === 'rejected';
  const isInfoRequested = member?.status === 'info_requested';

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';
export type MemberCountry = 'Pakistan' | 'Oman';
export type MemberRole = 'member' | 'admin';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation?: string;
}

export interface MemberProfile {
  uid: string;
  memberId?: string; // e.g., PLC-2026-00001
  fullName: string;
  email: string;
  mobile: string;
  country: MemberCountry;
  currentLocation: string; // City / Province / Wilayat
  idNumber: string; // CNIC or Passport
  photoURL?: string;
  paymentReceiptURL?: string;
  receiptReference?: string;
  status: MemberStatus;
  adminNote?: string;
  registeredAt: string;
  approvedAt?: string;
  memberSince?: string;
  emergencyContact: EmergencyContact;
  role: MemberRole;
}

/** Minimal fields exposed by the public QR verifier; never include contact or ID data. */
export interface PublicMemberProfile {
  uid: string;
  memberId: string;
  fullName: string;
  country: MemberCountry;
  currentLocation: string;
  photoURL?: string;
  status: 'approved';
  memberSince?: string;
}

export interface ElectionOption {
  id: string;
  label: string;
}

export interface CommunityElection {
  title: string;
  description: string;
  options: ElectionOption[];
  optionIds: string[];
  status: 'open' | 'closed';
  closesAt: import('firebase/firestore').Timestamp;
  createdAt?: import('firebase/firestore').Timestamp;
}

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type?: 'approval' | 'info_request' | 'announcement' | 'alert';
}

export interface RegistrationFormData {
  fullName: string;
  email: string;
  mobile: string;
  country: MemberCountry;
  currentLocation: string;
  idNumber: string;
  password: string;
  confirmPassword: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  acceptTerms: boolean;
  photoFile?: File | null;
  paymentReceiptFile?: File | null;
  receiptReference?: string;
}

import { MemberProfile, MemberNotification } from '../types';

/**
 * PLACEHOLDER / DEMO SEED DATA
 * All records here are strictly mock/sample demonstration items.
 */

export const SAMPLE_MEMBER_APPROVED: MemberProfile = {
  uid: "sample-approved-uid-12345",
  memberId: "PLC-2026-00042",
  fullName: "Sample Member (Muhammad Tariq Khan)",
  email: "sample.member@pakistanlabour.org",
  mobile: "+968 9123 4567",
  country: "Oman",
  currentLocation: "Ruwi, Muscat, Sultanate of Oman",
  idNumber: "37405-1234567-9",
  photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  status: "approved",
  adminNote: "Identity and Oman employment resident visa confirmed.",
  registeredAt: "2026-01-15T08:30:00Z",
  approvedAt: "2026-01-16T14:15:00Z",
  memberSince: "January 2026",
  emergencyContact: {
    name: "Shahid Khan",
    phone: "+92 300 1234567",
    relation: "Brother (Lahore)"
  },
  role: "member"
};

export const SAMPLE_MEMBER_PENDING: MemberProfile = {
  uid: "sample-pending-uid-67890",
  fullName: "Sample Member (Bilal Ahmed)",
  email: "bilal.ahmed.sample@example.com",
  mobile: "+968 9876 5432",
  country: "Oman",
  currentLocation: "Sohar Industrial Zone, Oman",
  idNumber: "61101-7654321-3",
  photoURL: "",
  status: "pending",
  adminNote: "",
  registeredAt: "2026-10-24T12:00:00Z",
  emergencyContact: {
    name: "Ahmed Hassan",
    phone: "+92 333 9876543",
    relation: "Father"
  },
  role: "member"
};

export const SAMPLE_NOTIFICATIONS: MemberNotification[] = [
  {
    id: "notif-sample-1",
    title: "Registration Approved",
    body: "Welcome to Pakistan Labour Community! Your membership card is ready to download.",
    createdAt: "2026-01-16T14:15:00Z",
    read: false,
    type: "approval"
  },
  {
    id: "notif-sample-2",
    title: "Oman Labour Welfare Advisory",
    body: "Consular team visiting Salalah this Saturday for passport renewals and legal guidance.",
    createdAt: "2026-02-01T10:00:00Z",
    read: true,
    type: "announcement"
  }
];

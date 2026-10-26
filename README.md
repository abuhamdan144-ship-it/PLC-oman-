# Pakistan Labour Community — Member Portal

An official, responsive civic web application for the **Pakistan Labour Community**, uniting and supporting Pakistani workers, expatriates, and community members connected between **Pakistan** and the **Sultanate of Oman**.

---

## 🏛️ Features

- **Civic Member Registration**: Full registration with client-side image compression (under 500 KB), mobile and CNIC/Passport validation, and emergency contact details.
- **Admin Verification Workflow**: Real-time review queue with live `onSnapshot` syncing. Administrators can approve, request info, or reject applications.
- **Automatic Sequential Member ID Generation**: Upon approval, a Firestore transaction atomically issues standard official IDs (e.g., `PLC-2026-00001`).
- **Double-Sided Digital Membership Card**:
  - Interactive 3D flip card with front and back view toggling.
  - Authentic Pakistan and Oman flags with strict civic design.
  - Live QR code encoding the member's public verification URL.
  - Client-side PNG download for both front and back sides.
  - Specialized print stylesheet (`window.print()`).
  - **Strict Brand Rule Compliant**: Card never includes the app emblem; the emblem appears only on official portal headers and authentication surfaces.
- **Public Verification Desk (`/verify`)**: Validates QR code scans to confirm authentic active membership.
- **Worker Rights Handbook & Helplines**: Omani labour protections (Wage Protection System, Midday summer work ban, passport retention prohibition) and consular embassy emergency contacts.

---

## 🛡️ Promoting the First Admin in Firebase Console

Follow these steps to designate your first administrator account in Firebase:

1. **Register an Account**:
   - Open the web application and register via `/register` using your desired admin email address.
   - Upon submitting, your account will be created in Firebase Authentication with an initial `pending` document in Firestore.

2. **Open Firebase Console**:
   - Navigate to [https://console.firebase.google.com/](https://console.firebase.google.com/).
   - Select the project: `pakistan-labour-community`.

3. **Locate your User UID**:
   - Go to **Authentication** > **Users** tab.
   - Find your registered email and copy the **User UID** string.

4. **Update the Firestore Document**:
   - In the left sidebar, click **Firestore Database**.
   - Navigate to the `members` collection.
   - Locate the document matching your User UID.
   - Click on the document to edit its fields:
     - Set `role` from `"member"` to `"admin"`.
     - Set `status` from `"pending"` to `"approved"`.
     - Set `memberId` to `"PLC-2026-00001"` (or your preferred admin ID).
     - Set `memberSince` to `"January 2026"`.
     - Click **Save**.

5. **Access the Admin Desk**:
   - Return to the application or sign in. You will now have direct access to `/admin/registrations` to approve, reject, or request information from applicants in real-time.

---

## 🚀 Deployment & Security Rules

### Deploy Firestore Rules
Deploy the included `firestore.rules` using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules
Deploy the included `storage.rules`:
```bash
firebase deploy --only storage
```

### Build for Production
```bash
npm run build
```
This generates the optimized production build in `/dist`.

## 🔐 Separate administrator access

The member sign-in and administrator sign-in are separate routes:

- Members: `/login`
- Administrators: `/admin/login`

Administrator access is granted only after Firebase Authentication succeeds and the signed-in user's Firestore document in `members/{uid}` has `role: "admin"`. The application no longer trusts a local-storage flag, an email address alone, hardcoded credentials, or automatic admin account creation. Firestore rules enforce the same role check for protected administrator data. Promote the first administrator manually in Firebase Console as described above, then deploy `firestore.rules`.

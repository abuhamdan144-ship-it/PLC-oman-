# Fix Firebase Registration and Authentication Errors

Resolve registration failure (`FirebaseError`) during member registration by surfacing actionable Firebase console diagnostics, handling specific Firebase error codes (`auth/operation-not-allowed`, `auth/unauthorized-domain`, `permission-denied`), and safeguarding the registration pipeline.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your answers to the clarifying questions:
> - **Real Firebase Only**: Purely real Firebase will be used (no mock fallback). Detailed console configuration instructions will be displayed directly inside the UI whenever Firebase Authentication or Firestore permissions require configuration.
> - **Manual Admin Promotion**: Administrator roles will be assigned solely via the Firebase Console as requested (no bypass switch), preserving production integrity.

## 1. Overview & Root Cause Analysis

When calling `createUserWithEmailAndPassword` or `setDoc(memberDocRef, ...)`, the Firebase modular SDK throws `FirebaseError` if:
1. **Email/Password provider is disabled** in the Firebase console for project `pakistan-labour-community` (`auth/operation-not-allowed`).
2. **The Cloud Run development domain** (`ais-dev-sl5muzyzhiyee75fr6cnsd-469166214171.europe-west1.run.app`) is not listed under **Authorized Domains** (`auth/unauthorized-domain`).
3. **Firestore or Storage security rules** have not been published, causing `permission-denied` on document creation.
4. **Photo upload failure**: If Firebase Storage is uninitialized or blocked, failing photo upload must not abort member document creation.

## 2. User Experience & Visual Design

- **Rich Diagnostic Banner**: When a Firebase configuration error is caught, the app renders a dedicated civic alert panel detailing:
  - Exact error code (`auth/operation-not-allowed`, `auth/unauthorized-domain`, etc.) and description.
  - Step-by-step guidance on enabling Email/Password in Firebase Console (`Build > Authentication > Sign-in method > Email/Password`).
  - One-click copy for the current domain to add to `Authentication > Settings > Authorized domains`.
  - Direct link to `https://console.firebase.google.com/project/pakistan-labour-community/authentication`.
- **Fault-Tolerant Registration Pipeline**:
  - Encapsulate photo storage upload in a guarded step: if Storage rules or bucket reject the photo, proceed with member profile creation and default avatar rather than blocking registration.
- **Consistent Login Diagnostics**: Apply the same structured error guidance to `LoginPage.tsx` for seamless troubleshooting.

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    RegisterPage Form                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
            1. createUserWithEmailAndPassword(auth, ...)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [Success: User UID]            [Error: FirebaseError]
               │                               │
    2. Guarded Photo Upload                    ▼
    (Storage: profile-photos)         Parse Error Code:
               │                      - auth/operation-not-allowed
               ▼                      - auth/unauthorized-domain
    3. setDoc(members/{uid})          - auth/network-request-failed
               │                      - permission-denied
               ▼                               │
       Navigate to                             ▼
    /pending-approval                 Render In-App Firebase
                                      Console Guidance Card
```

## 4. Execution Steps

1. **Update `RegisterPage.tsx`**:
   - Parse error object properties (`code`, `message`, `name`).
   - Implement structured error messages with direct Firebase Console setup steps for `auth/operation-not-allowed`, `auth/unauthorized-domain`, and `permission-denied`.
   - Provide a "Copy Domain" button for the authorized domain configuration.
   - Ensure the photo upload step gracefully degrades if Storage permissions are unconfigured.
2. **Update `LoginPage.tsx`**:
   - Implement the same detailed diagnostic handling for `auth/operation-not-allowed` and `auth/unauthorized-domain`.
3. **Verify App Compilation**:
   - Run `compile_applet` and `lint_applet` to ensure pristine build state.

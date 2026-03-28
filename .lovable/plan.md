

# Fix OTP Delivery + Add Fallback

## Root Cause
Supabase Phone Auth returns 200 even when Twilio fails to deliver SMS. The delivery failure is silent — no errors in Supabase auth logs. This is a Twilio configuration issue, not a code issue.

## Diagnosis Steps (for the user)
1. Check **Twilio Console → Monitor → Messaging → Logs** for failed delivery attempts
2. If using a **trial account**: verify the target phone number in Twilio Console → Verified Caller IDs
3. If sending to **India (+91)**: Twilio requires DLT registration for India. Without it, all SMS to Indian numbers are blocked by telecom regulations

## Plan

### Option A: Fix Twilio (recommended if you need phone OTP)
- User verifies Twilio logs and fixes the delivery issue
- No code changes needed — the current implementation is correct

### Option B: Add email OTP as fallback (code change)
If Twilio SMS delivery can't be fixed quickly, update the login page to support **both email and phone** OTP:

**File: `app/login/page.js`**
- Add a toggle between "Phone" and "Email" login
- Email mode: calls `supabase.auth.signInWithOtp({ email })` — this uses Supabase's built-in email (no Twilio needed)
- Phone mode: keeps current Twilio-based flow
- Both modes use the same OTP verification step

This gives users a working login immediately while Twilio issues are resolved.

### Technical Details
- `supabase.auth.signInWithOtp({ email })` works out of the box — Supabase sends the OTP via its built-in email service
- For email verify: `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- The user profile creation logic stays the same, just uses `authData.user.email` instead of constructing a fake email from the phone number
- No database changes needed


import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Redirect to the Google Apps Script URL
  return NextResponse.redirect(
    'https://script.google.com/macros/s/AKfycbwXfwRhi66Xp0tAdcBQQz7xasCVR_ovo6KPO0pVG_Kp5dcMNL-rHTeUhzflers7PxzG/exec',
    302
  );
}

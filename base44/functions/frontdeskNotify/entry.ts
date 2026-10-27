import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Emails the front desk the moment a customer submits a booking request.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || '');
    if (!bookingId) return Response.json({ error: 'booking_id required' }, { status: 400 });

    const user = await base44.auth.me();
    const booking = await base44.asServiceRole.entities.BookingRequest.get(bookingId);

    if (user && user.role !== 'admin' && booking.created_by_id && booking.created_by_id !== user.id) {
      return Response.json({ error: 'Not your booking request' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users
      .filter((u: { role?: string }) => u.role === 'admin')
      .map((u: { alert_email?: string; email?: string }) => u.alert_email || u.email)
      .filter(Boolean);

    if (recipients.length === 0) return Response.json({ alerted: 0 });

    const rows: [string, string][] = [
      ['Customer', booking.customer_name],
      ['Phone', booking.phone],
      ['Artisan requested', booking.artisan_name || booking.artisan_id],
      ['Preferred date', booking.preferred_date || 'Flexible'],
      ['Job', booking.notes || 'No description supplied'],
    ];

    const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#141414;line-height:1.5">
      <p style="margin:0 0 4px;letter-spacing:.08em;text-transform:uppercase;color:#A14B33;font-size:11px">Agently Frontdesk</p>
      <h2 style="margin:0 0 16px">New booking request</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-size:15px">
        ${rows.map(([k, v]) => `<tr><td style="color:#6b6b6b">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}
      </table>
      <p style="margin:20px 0 0">Open the front desk to dispatch this job to nearby artisans.</p>
    </div>`;

    for (const to of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject: `New booking request — ${booking.customer_name} for ${booking.artisan_name || 'an artisan'}`,
        body: html,
      });
    }

    return Response.json({ alerted: recipients.length });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
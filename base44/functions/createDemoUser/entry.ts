import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Invite the demo user as admin
    const inviteResult = await base44.auth.inviteUser(
      'demo@beanledgerexport.com',
      'admin'
    );

    return Response.json({ success: true, message: 'Demo user invited. They will receive an email to set their password.', details: inviteResult });
  } catch (error) {
    return Response.json({ error: error.message, status: error.status }, { status: 500 });
  }
});
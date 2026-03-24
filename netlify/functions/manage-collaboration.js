/**
 * Netlify Function: Manage Collaboration
 * Handles trip sharing with specific users (invite, accept, revoke, list, etc.)
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions, getServiceClient } = require('./utils/auth');
const { getUserRole } = require('./utils/permissions');
const { notifyCollaborators } = require('./utils/notificationHelper');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { user, supabase } = authResult;
  const serviceClient = getServiceClient();

  try {
    const body = JSON.parse(event.body);
    const { action } = body;

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'action is required' })
      };
    }

    switch (action) {
      case 'invite':
        return await handleInvite(serviceClient, user, body, headers);
      case 'accept-invite':
        return await handleAcceptInvite(serviceClient, user, body, headers);
      case 'respond-invite':
        return await handleRespondInvite(serviceClient, user, body, headers);
      case 'list':
        return await handleList(serviceClient, user, body, headers);
      case 'revoke':
        return await handleRevoke(serviceClient, user, body, headers);
      case 'resend-invite':
        return await handleResendInvite(serviceClient, user, body, headers);
      case 'resend-notification':
        return await handleResendNotification(serviceClient, user, body, headers);
      case 'remove-self':
        return await handleRemoveSelf(serviceClient, user, body, headers);
      case 'get-role':
        return await handleGetRole(user, body, headers);
      case 'get-past-collaborators':
        return await handleGetPastCollaborators(serviceClient, user, headers);
      case 'accept-pending-by-email':
        return await handleAcceptPendingByEmail(serviceClient, user, headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
        };
    }
  } catch (error) {
    console.error('Error in manage-collaboration:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

/**
 * Invite a user to a trip by email
 */
async function handleInvite(serviceClient, user, { tripId, email, role }, headers) {
  if (!tripId || !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId and email are required' })
    };
  }

  // Normalize email
  email = email.trim().toLowerCase();
  role = role || 'ospite';

  if (!['viaggiatore', 'ospite'].includes(role)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid role' })
    };
  }

  // Cannot invite yourself
  if (email === user.email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'cannot_invite_self' })
    };
  }

  // Check caller's permission
  const callerRole = await getUserRole(user.id, tripId);
  if (!callerRole) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized' })
    };
  }

  // Viaggiatore can only invite ospite
  if (callerRole === 'viaggiatore' && role !== 'ospite') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'viaggiatore_can_only_invite_ospite' })
    };
  }

  // Ospite cannot invite anyone
  if (callerRole === 'ospite') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized to invite' })
    };
  }

  // Check if already a collaborator
  const { data: existingCollab } = await serviceClient
    .from('trip_collaborators')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', (await findUserByEmail(serviceClient, email))?.id || '00000000-0000-0000-0000-000000000000')
    .maybeSingle();

  if (existingCollab) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ success: false, error: 'already_collaborator' })
    };
  }

  // Check if registered user
  const registeredUser = await findUserByEmail(serviceClient, email);

  if (registeredUser) {
    // Utente registrato: aggiunto direttamente come accepted (nessun step di accettazione)
    const { error: insertError } = await serviceClient
      .from('trip_collaborators')
      .insert({
        trip_id: tripId,
        user_id: registeredUser.id,
        role,
        invited_by: user.id,
        status: 'accepted'
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ success: false, error: 'already_collaborator' })
        };
      }
      throw insertError;
    }

    // Get trip title for notification
    const { data: trip } = await serviceClient
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

    // Notifica informativa (non richiede azione)
    await serviceClient.from('notifications').insert({
      user_id: registeredUser.id,
      type: 'collaboration_added',
      trip_id: tripId,
      actor_id: user.id,
      message: {
        it: `Ti ha aggiunto come ${role === 'viaggiatore' ? 'viaggiatore' : 'ospite'} al viaggio "${tripTitle}"`,
        en: `Added you as ${role === 'viaggiatore' ? 'traveler' : 'guest'} to trip "${tripTitle}"`
      }
    });

    // Build trip URL
    const siteUrl = process.env.URL || 'https://travel-flow.com';
    const tripUrl = `${siteUrl}/trip.html?id=${tripId}`;

    // Get profile info for the response
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('username, email')
      .eq('id', registeredUser.id)
      .single();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: 'invite_sent',
        tripUrl,
        collaborator: {
          id: registeredUser.id,
          email: profile?.email || email,
          username: profile?.username,
          role,
          status: 'accepted',
          type: 'collaborator'
        }
      })
    };
  } else {
    // Unregistered user: create invitation
    const token = crypto.randomBytes(32).toString('hex');

    // Check existing invitation
    const { data: existingInvite } = await serviceClient
      .from('trip_invitations')
      .select('id, status')
      .eq('trip_id', tripId)
      .eq('email', email)
      .maybeSingle();

    if (existingInvite && existingInvite.status === 'pending') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ success: false, error: 'already_invited' })
      };
    }

    if (existingInvite) {
      // Re-invite (after revoke): update existing record
      await serviceClient
        .from('trip_invitations')
        .update({
          role,
          invited_by: user.id,
          status: 'pending',
          token,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInvite.id);
    } else {
      await serviceClient
        .from('trip_invitations')
        .insert({
          trip_id: tripId,
          email,
          role,
          invited_by: user.id,
          token
        });
    }

    // Build invite URL for the caller to share manually (WhatsApp, email, etc.)
    const siteUrl = process.env.URL || 'https://travel-flow.com';
    const inviteUrl = `${siteUrl}/index.html?invite=${token}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: 'invite_sent',
        inviteUrl,
        invitation: {
          email,
          role,
          status: 'pending',
          type: 'invitation'
        }
      })
    };
  }
}

/**
 * Accept an invitation by token
 */
async function handleAcceptInvite(serviceClient, user, { token }, headers) {
  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'token is required' })
    };
  }

  // Find invitation
  const { data: invite, error: findError } = await serviceClient
    .from('trip_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (findError || !invite) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'invite_not_found' })
    };
  }

  // Verifica email — se diversa, logga un avviso ma consenti (il possesso del token è sufficiente)
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    console.log(`[accept-invite] Email diversa: invito per ${invite.email}, accettato da ${user.email} (consentito tramite token)`);
  }

  // Add to collaborators (o aggiorna se già esiste con status 'pending')
  const { error: insertError } = await serviceClient
    .from('trip_collaborators')
    .insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by
    });

  if (insertError) {
    if (insertError.code === '23505') {
      // Record già esistente (creato da acceptPendingByEmail con status 'pending')
      // Aggiorna a 'accepted'
      await serviceClient
        .from('trip_collaborators')
        .update({ status: 'accepted' })
        .eq('trip_id', invite.trip_id)
        .eq('user_id', user.id);
    } else {
      throw insertError;
    }
  }

  // Mark invitation as accepted
  await serviceClient
    .from('trip_invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  // Notify the inviter
  const { data: trip } = await serviceClient
    .from('trips')
    .select('data')
    .eq('id', invite.trip_id)
    .single();

  const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

  await serviceClient.from('notifications').insert({
    user_id: invite.invited_by,
    type: 'invitation_accepted',
    trip_id: invite.trip_id,
    actor_id: user.id,
    message: {
      it: `Ha accettato l'invito al viaggio "${tripTitle}"`,
      en: `Accepted the invitation to trip "${tripTitle}"`
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      tripId: invite.trip_id,
      role: invite.role
    })
  };
}

/**
 * List collaborators and pending invitations for a trip
 */
async function handleList(serviceClient, user, { tripId }, headers) {
  if (!tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId is required' })
    };
  }

  // Verify user has access to this trip
  const callerRole = await getUserRole(user.id, tripId);
  if (!callerRole) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized' })
    };
  }

  // Get trip owner info
  const { data: trip } = await serviceClient
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  const { data: ownerProfile } = await serviceClient
    .from('profiles')
    .select('username, email')
    .eq('id', trip.user_id)
    .single();

  // Get collaborators with profile info
  const { data: collabs } = await serviceClient
    .from('trip_collaborators')
    .select('id, user_id, role, invited_by, created_at, status')
    .eq('trip_id', tripId);

  const collaborators = [];
  if (collabs) {
    for (const c of collabs) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('username, email')
        .eq('id', c.user_id)
        .single();

      collaborators.push({
        id: c.id,
        userId: c.user_id,
        email: profile?.email,
        username: profile?.username,
        role: c.role,
        status: c.status,
        invitedBy: c.invited_by,
        createdAt: c.created_at,
        type: 'collaborator'
      });
    }
  }

  // Get pending invitations
  const { data: invitations } = await serviceClient
    .from('trip_invitations')
    .select('id, email, role, invited_by, status, created_at, updated_at')
    .eq('trip_id', tripId)
    .in('status', ['pending']);

  // Deduplica: escludi le invitation per email che hanno già un record in trip_collaborators.
  // Può succedere quando un utente non registrato riceve un invito (→ trip_invitations pending),
  // poi si registra e accetta — trip_collaborators viene aggiornato ma trip_invitations rimane pending.
  const collaboratorEmails = new Set(collaborators.map(c => (c.email || '').toLowerCase()));
  const filteredInvitations = (invitations || []).filter(
    inv => !collaboratorEmails.has((inv.email || '').toLowerCase())
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      owner: {
        userId: trip.user_id,
        email: ownerProfile?.email,
        username: ownerProfile?.username,
        role: 'proprietario'
      },
      collaborators: collaborators || [],
      invitations: filteredInvitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invited_by,
        status: inv.status,
        createdAt: inv.created_at,
        type: 'invitation'
      })),
      callerRole
    })
  };
}

/**
 * Revoke a collaborator's access or an invitation
 */
async function handleRevoke(serviceClient, user, { tripId, collaboratorId, invitationId }, headers) {
  if (!tripId || (!collaboratorId && !invitationId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId and collaboratorId or invitationId are required' })
    };
  }

  const callerRole = await getUserRole(user.id, tripId);
  if (!callerRole || callerRole === 'ospite') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized' })
    };
  }

  if (collaboratorId) {
    // Get the collaborator to check permissions
    const { data: collab } = await serviceClient
      .from('trip_collaborators')
      .select('id, user_id, role, invited_by')
      .eq('id', collaboratorId)
      .eq('trip_id', tripId)
      .single();

    if (!collab) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Collaborator not found' })
      };
    }

    // Viaggiatore can only revoke ospiti they invited
    if (callerRole === 'viaggiatore') {
      if (collab.role !== 'ospite' || collab.invited_by !== user.id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ success: false, error: 'Not authorized to revoke this collaborator' })
        };
      }
    }

    await serviceClient
      .from('trip_collaborators')
      .delete()
      .eq('id', collaboratorId);

    // Notify the revoked user
    const { data: trip } = await serviceClient
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

    await serviceClient.from('notifications').insert({
      user_id: collab.user_id,
      type: 'collaboration_revoked',
      trip_id: tripId,
      actor_id: user.id,
      message: {
        it: `Il tuo accesso al viaggio "${tripTitle}" è stato revocato`,
        en: `Your access to trip "${tripTitle}" has been revoked`
      }
    });
  }

  if (invitationId) {
    // Viaggiatore can only revoke invitations they sent
    if (callerRole === 'viaggiatore') {
      const { data: inv } = await serviceClient
        .from('trip_invitations')
        .select('invited_by')
        .eq('id', invitationId)
        .eq('trip_id', tripId)
        .single();

      if (!inv || inv.invited_by !== user.id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ success: false, error: 'Not authorized to revoke this invitation' })
        };
      }
    }

    await serviceClient
      .from('trip_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('trip_id', tripId);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Resend an invitation email
 */
async function handleResendInvite(serviceClient, user, { invitationId }, headers) {
  if (!invitationId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'invitationId is required' })
    };
  }

  const { data: invite } = await serviceClient
    .from('trip_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Invitation not found' })
    };
  }

  // Verify caller can resend
  const callerRole = await getUserRole(user.id, invite.trip_id);
  if (!callerRole || callerRole === 'ospite') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized' })
    };
  }

  // Viaggiatore can only resend invitations they sent
  if (callerRole === 'viaggiatore' && invite.invited_by !== user.id) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized to resend this invitation' })
    };
  }

  // Build invite URL for the caller to share manually
  const siteUrl = process.env.URL || 'https://travel-flow.com';
  const inviteUrl = `${siteUrl}/index.html?invite=${invite.token}`;

  // Update timestamp
  await serviceClient
    .from('trip_invitations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', invitationId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, inviteUrl })
  };
}

/**
 * Reinvia notifica in-app a un collaboratore registrato in attesa
 */
async function handleResendNotification(serviceClient, user, { tripId, collaboratorId }, headers) {
  if (!tripId || !collaboratorId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId and collaboratorId are required' })
    };
  }

  // Verifica che il collaboratore esista e sia pending
  const { data: collab } = await serviceClient
    .from('trip_collaborators')
    .select('id, user_id, role, status')
    .eq('id', collaboratorId)
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .single();

  if (!collab) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Pending collaborator not found' })
    };
  }

  // Verifica permessi del chiamante
  const callerRole = await getUserRole(user.id, tripId);
  if (!callerRole || callerRole === 'ospite') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Not authorized' })
    };
  }

  // Titolo viaggio per la notifica
  const { data: trip } = await serviceClient
    .from('trips')
    .select('data')
    .eq('id', tripId)
    .single();

  const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

  // Inserisci nuova notifica di invito
  await serviceClient.from('notifications').insert({
    user_id: collab.user_id,
    type: 'collaboration_invite',
    trip_id: tripId,
    actor_id: user.id,
    message: {
      it: `Ti ha invitato come ${collab.role === 'viaggiatore' ? 'viaggiatore' : 'ospite'} al viaggio "${tripTitle}"`,
      en: `Invited you as ${collab.role === 'viaggiatore' ? 'traveler' : 'guest'} to trip "${tripTitle}"`
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Remove yourself from a trip
 */
async function handleRemoveSelf(serviceClient, user, { tripId }, headers) {
  if (!tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId is required' })
    };
  }

  const { error } = await serviceClient
    .from('trip_collaborators')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', user.id);

  if (error) throw error;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Get user's role for a trip
 */
async function handleGetRole(user, { tripId }, headers) {
  if (!tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId is required' })
    };
  }

  const role = await getUserRole(user.id, tripId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, role })
  };
}

/**
 * Respond to a collaboration invite (accept or decline) for registered users
 */
async function handleRespondInvite(serviceClient, user, { tripId, accept }, headers) {
  if (!tripId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'tripId is required' })
    };
  }

  // Find the pending collaborator record
  const { data: collab } = await serviceClient
    .from('trip_collaborators')
    .select('id, role, invited_by, status')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!collab) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'No pending invite found' })
    };
  }

  // Get trip title for notifications
  const { data: trip } = await serviceClient
    .from('trips')
    .select('data')
    .eq('id', tripId)
    .single();

  const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

  if (accept) {
    // Accept: update status to 'accepted'
    await serviceClient
      .from('trip_collaborators')
      .update({ status: 'accepted' })
      .eq('id', collab.id);

    // Marca anche l'eventuale invitation in trip_invitations come accepted
    // per evitare duplicati nel share modal del proprietario
    await serviceClient
      .from('trip_invitations')
      .update({ status: 'accepted' })
      .eq('trip_id', tripId)
      .eq('email', user.email.trim().toLowerCase())
      .eq('status', 'pending');

    // Notify the inviter
    await serviceClient.from('notifications').insert({
      user_id: collab.invited_by,
      type: 'invitation_accepted',
      trip_id: tripId,
      actor_id: user.id,
      message: {
        it: `Ha accettato l'invito al viaggio "${tripTitle}"`,
        en: `Accepted the invitation to trip "${tripTitle}"`
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, action: 'accepted', tripId })
    };
  } else {
    // Decline: delete the collaborator record
    await serviceClient
      .from('trip_collaborators')
      .delete()
      .eq('id', collab.id);

    // Notify the inviter
    await serviceClient.from('notifications').insert({
      user_id: collab.invited_by,
      type: 'invitation_declined',
      trip_id: tripId,
      actor_id: user.id,
      message: {
        it: `Ha rifiutato l'invito al viaggio "${tripTitle}"`,
        en: `Declined the invitation to trip "${tripTitle}"`
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, action: 'declined' })
    };
  }
}

/**
 * Get all distinct emails/usernames the current user has previously invited
 */
async function handleGetPastCollaborators(serviceClient, user, headers) {
  const results = new Map(); // email -> { email, username }

  // From trip_collaborators (registered users invited by this user)
  const { data: collabs } = await serviceClient
    .from('trip_collaborators')
    .select('user_id')
    .eq('invited_by', user.id);

  if (collabs && collabs.length > 0) {
    const userIds = [...new Set(collabs.map(c => c.user_id))];
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('email, username')
      .in('id', userIds);

    for (const p of (profiles || [])) {
      if (p.email && p.email !== user.email) {
        results.set(p.email, { email: p.email, username: p.username || null });
      }
    }
  }

  // From trip_invitations (unregistered users invited by this user)
  const { data: invitations } = await serviceClient
    .from('trip_invitations')
    .select('email')
    .eq('invited_by', user.id);

  for (const inv of (invitations || [])) {
    if (inv.email && inv.email !== user.email && !results.has(inv.email)) {
      results.set(inv.email, { email: inv.email, username: null });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      suggestions: Array.from(results.values())
    })
  };
}

/**
 * Find a registered user by email
 */
async function findUserByEmail(serviceClient, email) {
  const { data } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  return data;
}

/**
 * Send invite email using Supabase auth
 */
async function sendInviteEmail(serviceClient, email, token, inviter, tripId) {
  try {
    // Get trip title for the email
    const { data: trip } = await serviceClient
      .from('trips')
      .select('data')
      .eq('id', tripId)
      .single();

    const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

    // Get inviter name
    const { data: inviterProfile } = await serviceClient
      .from('profiles')
      .select('username')
      .eq('id', inviter.id)
      .single();

    const inviterName = inviterProfile?.username || inviter.email;
    const siteUrl = process.env.URL || 'https://travel-flow.com';
    const inviteUrl = `${siteUrl}/index.html?invite=${token}`;

    // Use Supabase auth admin to invite by email
    // This sends a magic link email that creates the user account
    const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_token: token,
        trip_title: tripTitle,
        inviter_name: inviterName
      },
      redirectTo: inviteUrl
    });

    if (error) {
      // If user already exists in auth (but not in profiles), just log
      console.warn('Invite email error (non-fatal):', error.message);
    }
  } catch (error) {
    console.error('Failed to send invite email:', error);
    // Non-fatal: invitation is still created in the database
  }
}

/**
 * Converte gli inviti da trip_invitations in trip_collaborators con status 'pending'
 * e crea notifiche con accetta/rifiuta. NON accetta automaticamente.
 * Chiamato dopo la creazione del profilo per utenti appena registrati.
 */
async function handleAcceptPendingByEmail(serviceClient, user, headers) {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'no email' }) };
  }

  // Trova tutti gli inviti pendenti per questa email in trip_invitations
  const { data: invites, error } = await serviceClient
    .from('trip_invitations')
    .select('id, trip_id, role, invited_by')
    .eq('email', email)
    .eq('status', 'pending');

  if (error || !invites || invites.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, converted: 0 }) };
  }

  let converted = 0;

  for (const invite of invites) {
    // Crea collaboratore con status 'pending' (l'utente dovrà accettare)
    const { error: insertError } = await serviceClient
      .from('trip_collaborators')
      .insert({
        trip_id: invite.trip_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
        status: 'pending'
      });

    if (insertError && insertError.code !== '23505') {
      console.error(`[convert-invites] Errore inserimento per trip ${invite.trip_id}:`, insertError);
      continue;
    }

    // Info viaggio e invitante per la notifica
    const { data: trip } = await serviceClient
      .from('trips').select('data').eq('id', invite.trip_id).single();
    const tripTitle = trip?.data?.title?.it || trip?.data?.title || 'un viaggio';

    const { data: inviterProfile } = await serviceClient
      .from('profiles').select('username').eq('id', invite.invited_by).maybeSingle();

    // Crea notifica per l'utente invitato con azione accetta/rifiuta
    await serviceClient.from('notifications').insert({
      user_id: user.id,
      type: 'collaboration_invite',
      trip_id: invite.trip_id,
      actor_id: invite.invited_by,
      message: {
        it: `Ti ha invitato al viaggio "${tripTitle}" come ${invite.role}`,
        en: `Invited you to trip "${tripTitle}" as ${invite.role}`
      }
    }).catch(() => {});

    converted++;
  }

  console.log(`[convert-invites] ${email}: ${converted}/${invites.length} inviti convertiti in pending`);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, converted })
  };
}

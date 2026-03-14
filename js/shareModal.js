/**
 * Share Modal - Shared module for trip sharing with link + user invitations
 * Used by both tripPage.js and homePage.js
 */

const shareModal = {
  /**
   * Costruisce il messaggio precostruito per la clipboard
   * Se il nome contiene già "viaggio", usa: al "Nome Viaggio"
   * Altrimenti: al viaggio "Nome"
   */
  _buildShareMessage(tripName, url, { type = 'link', role = '', ownerName = '' } = {}) {
    const name = tripName || '';
    const hasViaggio = /viaggio/i.test(name);
    const alViaggio = hasViaggio ? `al "${name}"` : `al viaggio "${name}"`;

    if (type === 'link') {
      // Link pubblico (sola lettura)
      const organizzato = ownerName ? ` organizzato da ${ownerName}` : '';
      return name
        ? `✈️ Dai un'occhiata ${alViaggio}${organizzato} su Travel Flow!\n${url}`
        : url;
    }

    // Invito collaboratore
    const roleLabel = role === 'viaggiatore' ? 'viaggiatore' : 'ospite';

    if (type === 'invite-registered') {
      return name
        ? `✈️ Ti ho invitato come ${roleLabel} ${alViaggio} su Travel Flow!\nAccedi per visualizzarlo: ${url}`
        : url;
    }

    if (type === 'invite-unregistered') {
      return name
        ? `✈️ Ti ho invitato come ${roleLabel} ${alViaggio} su Travel Flow!\nRegistrati e accedi con questo link: ${url}`
        : url;
    }

    return url;
  },

  /**
   * Show the share modal for a trip
   * @param {string} tripId - The trip ID
   * @param {string} userRole - Current user's role: 'proprietario', 'viaggiatore', or 'ospite'
   * @param {string} [tripName] - Nome del viaggio (per messaggi precostruiti)
   */
  async show(tripId, userRole, tripName) {
    // Salva tripName per uso nei metodi interni
    this._currentTripName = tripName || '';
    // Remove existing modal if any
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    const canInvite = userRole === 'proprietario' || userRole === 'viaggiatore';
    const canInviteViaggiatore = userRole === 'proprietario';

    const roleSelectHTML = canInviteViaggiatore
      ? `<select id="share-invite-role" class="share-invite-role">
           <option value="viaggiatore">${i18n.t('share.roleViaggiatore') || 'Viaggiatore'}</option>
           <option value="ospite">${i18n.t('share.roleOspite') || 'Ospite'}</option>
         </select>`
      : '';

    const inviteSectionHTML = canInvite ? `
      <div class="share-section">
        <h3 class="share-section-title" data-i18n="share.inviteTitle">Invita per email</h3>
        <div class="share-invite-form">
          <div class="share-invite-input-wrapper">
            <input type="text" inputmode="email" autocomplete="off" id="share-invite-email" class="form-input share-invite-email" placeholder="email@esempio.com">
            <div class="share-invite-suggestions" id="share-invite-suggestions"></div>
          </div>
          ${roleSelectHTML}
          <button class="btn btn-primary share-invite-btn" id="share-invite-btn">
            <span class="share-invite-btn-label" data-i18n="share.inviteBtn">Invita</span>
            <span class="spinner spinner-sm share-invite-spinner" style="display:none"></span>
          </button>
        </div>
        <div class="share-invite-message" id="share-invite-message"></div>
      </div>
    ` : '';

    const modalHTML = `
      <div class="modal-overlay active" id="share-modal">
        <div class="modal modal--share">
          <div class="modal-header">
            <h2 data-i18n="trip.shareTitle">Condividi viaggio</h2>
            <button class="modal-close" id="share-modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <!-- Section 1: Invite by email -->
            ${inviteSectionHTML}

            <!-- Section 2: Collaborators list -->
            <div id="share-collaborators-section" class="share-section" style="display: none;">
              <h3 class="share-section-title" data-i18n="share.collaboratorsTitle">Collaboratori</h3>
              <div id="share-collaborators-list" class="share-collaborators-list">
                <div class="share-collaborators-loading"><span class="spinner spinner-sm"></span></div>
              </div>
            </div>

            <!-- Section 3: Link sharing -->
            <div class="share-section share-section--link">
              <div class="share-link-row">
                <h3 class="share-link-title" data-i18n="share.linkTitle">Link</h3>
                <code class="share-link-code" id="share-link-code">Generazione link...</code>
                <button class="share-copy-icon-btn" id="share-copy-btn" disabled title="Copia link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <p class="share-description" data-i18n="trip.shareDescription">Chiunque con il link può visualizzare il viaggio.</p>
              <div class="share-copied-message" id="share-copied-message" data-i18n="trip.linkCopied">Link copiato!</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    const modal = document.getElementById('share-modal');
    const closeBtn = document.getElementById('share-modal-close');
    const copyBtn = document.getElementById('share-copy-btn');
    const linkCode = document.getElementById('share-link-code');
    const copiedMessage = document.getElementById('share-copied-message');

    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

    // Fetch share link
    let shareUrl = '';
    try {
      const response = await utils.authFetch('/.netlify/functions/share-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      });
      const result = await response.json();
      if (result.success && result.shareToken) {
        shareUrl = `${window.location.origin}/share.html?token=${result.shareToken}`;
        this._currentShareUrl = shareUrl;
        linkCode.textContent = shareUrl;
        copyBtn.disabled = false;
      } else {
        linkCode.textContent = i18n.t('common.error') || 'Errore';
      }
    } catch (err) {
      console.error('Error generating share token:', err);
      linkCode.textContent = i18n.t('common.error') || 'Errore';
    }

    // Copy link con messaggio precostruito
    copyBtn.addEventListener('click', async () => {
      if (!shareUrl) return;
      const ownerName = window.auth?.profile?.username || '';
      const textToCopy = this._buildShareMessage(this._currentTripName, shareUrl, {
        type: 'link', ownerName
      });
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.classList.add('copied');
        copiedMessage.classList.add('visible');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copiedMessage.classList.remove('visible');
        }, 2000);
      } catch (err) {
        document.execCommand('copy');
        copyBtn.classList.add('copied');
        copiedMessage.classList.add('visible');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copiedMessage.classList.remove('visible');
        }, 2000);
      }
    });

    // Invite button handler
    if (canInvite) {
      const inviteBtn = document.getElementById('share-invite-btn');
      const emailInput = document.getElementById('share-invite-email');
      const roleSelect = document.getElementById('share-invite-role');
      const inviteMessage = document.getElementById('share-invite-message');
      const suggestionsEl = document.getElementById('share-invite-suggestions');

      // Load past collaborators for autocomplete (fire and forget)
      let pastCollaborators = [];
      utils.authFetch('/.netlify/functions/manage-collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-past-collaborators' })
      }).then(r => r.json()).then(data => {
        if (data.success) pastCollaborators = data.suggestions || [];
      }).catch(() => {});

      const hideSuggestions = () => {
        suggestionsEl.innerHTML = '';
        suggestionsEl.classList.remove('active');
      };

      const selectSuggestion = (email) => {
        emailInput.value = email;
        hideSuggestions();
        emailInput.focus();
      };

      emailInput.addEventListener('input', () => {
        const q = emailInput.value.trim().toLowerCase();
        if (!q || pastCollaborators.length === 0) { hideSuggestions(); return; }

        const matches = pastCollaborators.filter(s =>
          s.email.toLowerCase().includes(q) ||
          (s.username && s.username.toLowerCase().includes(q))
        ).slice(0, 6);

        if (matches.length === 0) { hideSuggestions(); return; }

        suggestionsEl.innerHTML = matches.map((s, i) => {
          const label = s.username
            ? `<span class="share-suggest-name">${s.username}</span><span class="share-suggest-email">${s.email}</span>`
            : `<span class="share-suggest-email">${s.email}</span>`;
          return `<div class="share-suggest-item${i === 0 ? ' focused' : ''}" data-email="${s.email}">${label}</div>`;
        }).join('');
        suggestionsEl.classList.add('active');
      });

      suggestionsEl.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.share-suggest-item');
        if (item) { e.preventDefault(); selectSuggestion(item.dataset.email); }
      });

      emailInput.addEventListener('keydown', (e) => {
        if (!suggestionsEl.classList.contains('active')) return;
        const items = suggestionsEl.querySelectorAll('.share-suggest-item');
        const active = suggestionsEl.querySelector('.share-suggest-item.focused');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = active ? (active.nextElementSibling || items[0]) : items[0];
          active?.classList.remove('focused');
          next?.classList.add('focused');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = active ? (active.previousElementSibling || items[items.length - 1]) : items[items.length - 1];
          active?.classList.remove('focused');
          prev?.classList.add('focused');
        } else if (e.key === 'Enter') {
          const focused = active || items[0];
          if (focused) {
            e.preventDefault();
            e.stopImmediatePropagation();
            selectSuggestion(focused.dataset.email);
            return;
          }
        } else if (e.key === 'Escape') {
          hideSuggestions();
        }
      });

      emailInput.addEventListener('blur', () => setTimeout(hideSuggestions, 150));

      inviteBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          this._showInviteMessage(inviteMessage, i18n.t('share.invalidEmail') || 'Inserisci un\'email valida', 'error');
          return;
        }

        const role = roleSelect ? roleSelect.value : 'ospite';
        inviteBtn.disabled = true;
        inviteBtn.querySelector('.share-invite-btn-label').style.display = 'none';
        inviteBtn.querySelector('.share-invite-spinner').style.display = '';

        try {
          const response = await utils.authFetch('/.netlify/functions/manage-collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'invite', tripId, email, role })
          });
          const result = await response.json();

          if (result.success) {
            const msg = i18n.t('share.inviteLinkGenerated') || 'Link generato — copialo e condividilo';
            this._showInviteMessage(inviteMessage, msg, 'success');
            emailInput.value = '';
            // Refresh collaborators list, then show invite link under the new row
            await this._loadCollaborators(tripId, userRole);
            if (result.inviteUrl) {
              // Utente non registrato: mostra link invito specifico
              this._showInviteLinkUnderRow(email, result.inviteUrl, role, 'invite-unregistered');
            } else if (this._currentShareUrl) {
              // Utente registrato: usa share.html (genera preview WhatsApp con foto/titolo)
              // Share.html mostrerà un banner "Vai al tuo viaggio" agli utenti loggati
              this._showInviteLinkUnderRow(email, this._currentShareUrl, role, 'invite-registered');
            }
          } else {
            const errorMessages = {
              'already_collaborator': i18n.t('share.alreadyCollaborator') || 'Utente già collaboratore',
              'already_invited': i18n.t('share.alreadyInvited') || 'Utente già invitato',
              'cannot_invite_self': i18n.t('share.cannotInviteSelf') || 'Non puoi invitare te stesso',
              'viaggiatore_can_only_invite_ospite': i18n.t('share.canOnlyInviteGuests') || 'Puoi invitare solo ospiti'
            };
            const msg = errorMessages[result.error] || result.error || 'Errore';
            this._showInviteMessage(inviteMessage, msg, 'error');
          }
        } catch (err) {
          console.error('Error inviting user:', err);
          this._showInviteMessage(inviteMessage, i18n.t('common.error') || 'Errore', 'error');
        } finally {
          inviteBtn.disabled = false;
          inviteBtn.querySelector('.share-invite-btn-label').style.display = '';
          inviteBtn.querySelector('.share-invite-spinner').style.display = 'none';
        }
      });

      // Enter key to submit (when suggestions are not intercepting)
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !suggestionsEl.classList.contains('active')) inviteBtn.click();
      });
    }

    // Load collaborators list
    this._loadCollaborators(tripId, userRole);

    // Apply translations
    if (window.i18n) i18n.apply(modal);
  },

  /**
   * Show invite feedback message
   */
  _showInviteMessage(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = `share-invite-message share-invite-message--${type}`;
  },

  /**
   * Show a copyable invite link box under the collaborator row matching the email
   */
  _showInviteLinkUnderRow(email, inviteUrl, role, messageType = 'invite-unregistered') {
    // Remove any existing invite link box
    document.querySelectorAll('.share-invite-link-box').forEach(el => el.remove());

    // Find the collaborator row by data-email attribute
    const listEl = document.getElementById('share-collaborators-list');
    if (!listEl) return;
    const targetRow = listEl.querySelector(`.share-collaborator-row[data-email="${email.toLowerCase()}"]`);
    if (!targetRow) return;

    const label = i18n.t('share.copyInviteLink') || 'Copia il link e condividilo con';
    const box = document.createElement('div');
    box.className = 'share-invite-link-box';
    box.innerHTML = `
      <p class="share-invite-link-label">${label} <strong>${email}</strong></p>
      <div class="share-invite-link-row">
        <code class="share-invite-link-code">${inviteUrl}</code>
        <button class="share-copy-icon-btn share-invite-link-copy" title="Copia">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `;
    targetRow.after(box);

    const copyBtn = box.querySelector('.share-invite-link-copy');
    copyBtn.addEventListener('click', async () => {
      const inviteText = this._buildShareMessage(this._currentTripName, inviteUrl, {
        type: messageType, role: role || 'ospite'
      });
      try {
        await navigator.clipboard.writeText(inviteText);
      } catch { /* fallback ignored */ }
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
      utils.showToast(i18n.t('trip.linkCopied') || 'Link copiato!', 'success');
    });
  },

  /**
   * Load and render collaborators list
   */
  async _loadCollaborators(tripId, userRole) {
    const listEl = document.getElementById('share-collaborators-list');
    if (!listEl) return;

    try {
      const response = await utils.authFetch('/.netlify/functions/manage-collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', tripId })
      });
      const data = await response.json();

      const sectionEl = document.getElementById('share-collaborators-section');

      if (!data.success) {
        if (sectionEl) sectionEl.style.display = 'none';
        return;
      }

      let html = '';
      let hasItems = false;

      // Owner row
      if (data.owner) {
        html += this._renderCollaboratorRow({
          email: data.owner.email,
          username: data.owner.username,
          role: 'proprietario',
          type: 'owner'
        }, userRole, tripId);
        hasItems = true;
      }

      // Collaborators
      for (const c of (data.collaborators || [])) {
        html += this._renderCollaboratorRow(c, userRole, tripId);
        hasItems = true;
      }

      // Pending invitations
      for (const inv of (data.invitations || [])) {
        html += this._renderCollaboratorRow({
          ...inv,
          status: 'pending'
        }, userRole, tripId);
        hasItems = true;
      }

      // Show/hide section based on whether there are items
      if (sectionEl) {
        sectionEl.style.display = hasItems ? '' : 'none';
      }

      listEl.innerHTML = html;

      // Rimuovi vecchio listener prima di aggiungerne uno nuovo
      if (this._collaboratorClickHandler) {
        listEl.removeEventListener('click', this._collaboratorClickHandler);
      }
      this._bindCollaboratorActions(listEl, tripId, userRole);

    } catch (err) {
      console.error('Error loading collaborators:', err);
      listEl.innerHTML = '<div class="share-collaborators-empty">Errore nel caricamento</div>';
    }
  },

  /**
   * Get icon SVG for a collaborator role/status
   */
  _getRoleIcon(role, status) {
    if (status === 'pending') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>`;
    }
    if (role === 'proprietario') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-500)" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    }
    if (role === 'viaggiatore') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`;
    }
    // ospite
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-400)" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>`;
  },

  /**
   * Render a single collaborator row
   */
  _renderCollaboratorRow(item, userRole, tripId) {
    const displayName = item.username || item.email || '';
    const email = item.email || '';

    const roleBadgeClass = {
      'proprietario': 'share-role-badge--proprietario',
      'viaggiatore': 'share-role-badge--viaggiatore',
      'ospite': 'share-role-badge--ospite'
    }[item.role] || 'share-role-badge--ospite';

    const roleLabel = {
      'proprietario': i18n.t('share.roleProprietario') || 'Proprietario',
      'viaggiatore': i18n.t('share.roleViaggiatore') || 'Viaggiatore',
      'ospite': i18n.t('share.roleOspite') || 'Ospite'
    }[item.role] || item.role;

    let statusHTML = '';
    if (item.status === 'pending') {
      const statusLabel = item.type === 'collaborator'
        ? (i18n.t('share.pendingResponse') || 'In attesa di risposta')
        : (i18n.t('share.statusPending') || 'In attesa');
      statusHTML = `<span class="share-status share-status--pending">${statusLabel}</span>`;
    }

    // Actions based on user role and item type
    let actionsHTML = '';
    if (item.type !== 'owner') {
      const canRevoke = userRole === 'proprietario' ||
        (userRole === 'viaggiatore' && item.role === 'ospite');

      if (canRevoke) {
        if (item.type === 'invitation' && item.status === 'pending') {
          actionsHTML = `
            <button class="share-action-btn share-action-btn--resend" data-action="resend" data-invitation-id="${item.id}" title="${i18n.t('share.resend') || 'Reinvia'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="share-action-btn share-action-btn--revoke" data-action="revoke-invitation" data-invitation-id="${item.id}" title="${i18n.t('share.revoke') || 'Revoca'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          `;
        } else if (item.type === 'collaborator' && item.status === 'pending') {
          // Collaboratore registrato in attesa: reinvia notifica + revoca
          actionsHTML = `
            <button class="share-action-btn share-action-btn--resend" data-action="resend-notification" data-collaborator-id="${item.id}" data-trip-id="${tripId}" title="${i18n.t('share.resendNotification') || 'Reinvia notifica'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="share-action-btn share-action-btn--revoke" data-action="revoke-collaborator" data-collaborator-id="${item.id}" title="${i18n.t('share.revoke') || 'Revoca'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          `;
        } else if (item.type === 'collaborator') {
          actionsHTML = `
            <button class="share-action-btn share-action-btn--revoke" data-action="revoke-collaborator" data-collaborator-id="${item.id}" title="${i18n.t('share.revoke') || 'Revoca'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          `;
        }
      }
    }

    return `
      <div class="share-collaborator-row" data-item-id="${item.id || ''}" data-email="${email}" data-role="${item.role || ''}">
        <div class="share-collaborator-avatar">${(displayName[0] || '?').toUpperCase()}</div>
        <div class="share-collaborator-info">
          <div class="share-collaborator-name">${displayName}</div>
          ${email && email !== displayName ? `<div class="share-collaborator-email">${email}</div>` : ''}
        </div>
        <span class="share-role-badge ${roleBadgeClass}">${roleLabel}</span>
        ${statusHTML}
        <div class="share-collaborator-actions">${actionsHTML}</div>
      </div>
    `;
  },

  /**
   * Bind click handlers to collaborator action buttons
   */
  _bindCollaboratorActions(container, tripId, userRole) {
    const handler = async (e) => {
      const btn = e.target.closest('.share-action-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      btn.disabled = true;

      try {
        if (action === 'revoke-collaborator') {
          const collaboratorId = btn.dataset.collaboratorId;
          await utils.authFetch('/.netlify/functions/manage-collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revoke', tripId, collaboratorId })
          });
          btn.closest('.share-collaborator-row')?.remove();
        } else if (action === 'revoke-invitation') {
          const invitationId = btn.dataset.invitationId;
          await utils.authFetch('/.netlify/functions/manage-collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revoke', tripId, invitationId })
          });
          btn.closest('.share-collaborator-row')?.remove();
        } else if (action === 'resend-notification') {
          // Collaboratore registrato: mostra link diretto al viaggio
          const row = btn.closest('.share-collaborator-row');
          const email = row?.dataset.email || '';
          const rowRole = row?.dataset.role || 'ospite';
          const tripUrl = `${window.location.origin}/trip.html?id=${tripId}`;
          shareModal._showInviteLinkUnderRow(email, tripUrl, rowRole, 'invite-registered');
          btn.disabled = false;
          return;
        } else if (action === 'resend') {
          const invitationId = btn.dataset.invitationId;
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `<span class="spinner spinner-sm" style="border-color: rgba(255,255,255,0.4); border-top-color: white;"></span>`;
          const res = await utils.authFetch('/.netlify/functions/manage-collaboration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resend-invite', invitationId })
          });
          const resData = await res.json();
          if (resData.inviteUrl) {
            const row = btn.closest('.share-collaborator-row');
            const email = row?.dataset.email || '';
            const rowRole = row?.dataset.role || 'ospite';
            shareModal._showInviteLinkUnderRow(email, resData.inviteUrl, rowRole);
          }
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          return;
        }
      } catch (err) {
        console.error('Error performing action:', err);
        utils.showToast(i18n.t('common.error') || 'Errore', 'error');
        btn.disabled = false;
      }
    };
    this._collaboratorClickHandler = handler;
    container.addEventListener('click', handler);
  }
};

// Make available globally
window.shareModal = shareModal;

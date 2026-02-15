/**
 * Login Page - OTP and Google authentication flow
 */
(async function() {
  // Initialize i18n
  await i18n.init();
  i18n.apply();

  // Initialize auth
  await auth.init();

  // If already authenticated, redirect to home
  if (auth.isAuthenticated()) {
    window.location.href = '/index.html';
    return;
  }

  // If logged in but needs username, show modal
  if (auth.isLoggedIn() && auth.needsUsername) {
    auth.showUsernameModal();
    return;
  }

  // Load version
  try {
    const changelog = await utils.loadJSON('/data/changelog.json');
    if (changelog.versions && changelog.versions.length > 0) {
      document.getElementById('login-version').textContent = 'v' + changelog.versions[0].version;
    }
  } catch (e) {}

  // Load platform stats (public, no auth needed)
  try {
    const statsRes = await fetch('/.netlify/functions/get-platform-stats');
    const statsData = await statsRes.json();
    if (statsData.success && statsData.stats) {
      const { totalTrips, totalTravelDays, totalActivities } = statsData.stats;
      animateStatNumber('stat-trips', totalTrips);
      animateStatNumber('stat-days', totalTravelDays);
      animateStatNumber('stat-activities', totalActivities);
    }
  } catch (e) {
    console.log('Failed to load platform stats:', e);
  }

  // Google login button
  const googleBtn = document.getElementById('google-login-btn');
  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      googleBtn.disabled = false;
    }
  });

  // OTP Email Form
  const otpEmailForm = document.getElementById('otp-email-form');
  const otpEmail = document.getElementById('otp-email');
  const otpSendBtn = document.getElementById('otp-send-btn');
  const loginDivider = document.querySelector('.login-divider');

  // OTP Code Form
  const otpCodeForm = document.getElementById('otp-code-form');
  const otpCode = document.getElementById('otp-code');
  const otpVerifyBtn = document.getElementById('otp-verify-btn');
  const otpBackBtn = document.getElementById('otp-back-btn');
  const otpError = document.getElementById('otp-error');
  const otpSentTo = document.getElementById('otp-sent-to');

  let currentEmail = '';

  // Send OTP
  otpSendBtn.addEventListener('click', async () => {
    const email = otpEmail.value.trim();
    if (!email || !email.includes('@')) {
      otpEmail.focus();
      return;
    }

    otpSendBtn.disabled = true;
    otpSendBtn.querySelector('span').textContent = '...';

    try {
      await auth.sendOtp(email);
      currentEmail = email;
      // Show code input form
      otpEmailForm.style.display = 'none';
      loginDivider.style.display = 'none';
      googleBtn.style.display = 'none';
      otpCodeForm.style.display = 'block';
      otpSentTo.textContent = (i18n.t('auth.codeSentTo') || 'Codice inviato a') + ' ' + email;
      otpCode.focus();
    } catch (error) {
      console.error('OTP send error:', error);
      otpSendBtn.disabled = false;
      otpSendBtn.querySelector('span').textContent = i18n.t('auth.sendCode') || 'Invia codice';
    }
  });

  // Allow Enter key in email input
  otpEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      otpSendBtn.click();
    }
  });

  // Verify OTP
  otpVerifyBtn.addEventListener('click', async () => {
    const code = otpCode.value.trim();
    if (!code || code.length < 6) {
      otpCode.focus();
      return;
    }

    otpVerifyBtn.disabled = true;
    otpVerifyBtn.querySelector('span').textContent = '...';
    otpError.textContent = '';

    try {
      await auth.verifyOtp(currentEmail, code);
      // Auth state change will handle redirect
    } catch (error) {
      console.error('OTP verify error:', error);
      otpError.textContent = i18n.t('auth.invalidCode') || 'Codice non valido';
      otpVerifyBtn.disabled = false;
      otpVerifyBtn.querySelector('span').textContent = i18n.t('auth.verifyCode') || 'Verifica';
      otpCode.value = '';
      otpCode.focus();
    }
  });

  // Allow Enter key in code input
  otpCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      otpVerifyBtn.click();
    }
  });

  // Only allow numbers in code input
  otpCode.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  // Back to email form
  otpBackBtn.addEventListener('click', () => {
    otpCodeForm.style.display = 'none';
    otpEmailForm.style.display = 'flex';
    loginDivider.style.display = 'flex';
    googleBtn.style.display = 'flex';
    otpSendBtn.disabled = false;
    otpSendBtn.querySelector('span').textContent = i18n.t('auth.sendCode') || 'Invia codice';
    otpCode.value = '';
    otpError.textContent = '';
  });

  /**
   * Animate a number counting up from 0 to target
   */
  function animateStatNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el || target <= 0) {
      if (el) el.textContent = target || '0';
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString('it-IT');

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }
})();

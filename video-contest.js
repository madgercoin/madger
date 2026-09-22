(() => {
  const countdown = document.getElementById('contest-countdown');
  const contestClose = new Date('2026-09-22T23:59:00-04:00').getTime();
  if (countdown) {
    const renderCountdown = () => {
      const remaining = contestClose - Date.now();
      if (remaining <= 0) { countdown.textContent = 'CLOSED'; return false; }
      const totalMinutes = Math.floor(remaining / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      countdown.textContent = `${days}d ${hours}h ${minutes}m`;
      return true;
    };
    renderCountdown();
    const timer = setInterval(() => { if (!renderCountdown()) clearInterval(timer); }, 60000);
  }

  const quickRuleHeadings = [...document.querySelectorAll('#rules .card h3')];
  const introRuleHeading = quickRuleHeadings.find((node) => node.textContent.trim() === 'Official intro + outro');
  if (introRuleHeading?.nextElementSibling) {
    introRuleHeading.nextElementSibling.innerHTML = 'Every entry must begin with <a class="link-inline" href="/assets/Madger_Productions_Presents_Intro_clip.mp4" download><strong>Madger_Productions_Presents_Intro_clip.mp4</strong></a> and end with <a class="link-inline" href="/assets/Madger_Official_Outro_Clip.mp4" download><strong>Madger_Official_Outro_Clip.mp4</strong></a>. These are the exact contest masters supplied by MADGER. Do not substitute older intro, outro, or other MADGER video files.';
  }

  const assetsGrid = document.querySelector('#assets .grid2');
  if (assetsGrid && !document.getElementById('official-transparent-logo-card')) {
    const logoCard = document.createElement('article');
    logoCard.className = 'card asset-card';
    logoCard.id = 'official-transparent-logo-card';
    logoCard.innerHTML = `<img src="/assets/madger_official_logo_transparent_512.png" width="512" height="512" alt="Official transparent MADGER logo"><h3>Official Transparent MADGER Logo</h3><p>Use this exact transparent logo for contest branding. Do not redraw, recolor, recreate, place it on a fake background, or substitute another MADGER logo.</p><div class="asset-actions"><a class="button ghost" href="/assets/madger_official_logo_transparent_512.png" download="MADGER_Official_Transparent_Logo.png">Download Transparent Logo ↓</a></div>`;
    assetsGrid.appendChild(logoCard);
  }

  const form = document.getElementById('madger-contest-form');
  if (!form) return;

  const API = '/api/contest-entry';
  const UPLOAD_API = '/api/contest-upload';
  const MAX_BYTES = 1024 * 1024 * 1024;
  const titleInput = document.getElementById('video_title');
  const fileInput = document.getElementById('original_file');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('contest-submit');
  const progress = document.getElementById('upload-progress');
  const progressBar = document.getElementById('upload-progress-bar');
  let accepting = false;

  const setStatus = (message) => { if (status) status.textContent = message; };
  const setBusy = (busy) => {
    if (!submit) return;
    submit.disabled = busy || !accepting;
    submit.textContent = busy ? 'Submitting…' : accepting ? 'Submit Official Entry' : 'Submissions Unavailable';
  };
  const setProgress = (value) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    if (progress) { progress.style.display = 'block'; progress.setAttribute('aria-hidden', 'false'); }
    if (progressBar) progressBar.style.width = `${pct}%`;
  };
  const fileStem = (name) => { const dot = name.lastIndexOf('.'); return dot > 0 ? name.slice(0, dot) : name; };
  const checked = (id) => Boolean(document.getElementById(id)?.checked);
  const value = (id) => document.getElementById(id)?.value.trim() || '';

  async function refreshAvailability() {
    try {
      const response = await fetch(API, { method: 'GET', cache: 'no-store' });
      const data = await response.json();
      accepting = Boolean(response.ok && data?.ok && data?.assets_ready && data?.accepting && Date.now() <= contestClose);
      if (submit) { submit.disabled = !accepting; submit.textContent = accepting ? 'Submit Official Entry' : 'Submissions Unavailable'; }
      setStatus(accepting ? 'Secure contest submissions are open.' : Date.now() > contestClose ? 'The contest entry window has closed.' : 'Contest submission service is temporarily unavailable.');
    } catch (error) {
      console.error('contest availability', error);
      accepting = false;
      if (submit) { submit.disabled = true; submit.textContent = 'Submissions Unavailable'; }
      setStatus('Could not verify the contest submission service. Refresh this page before submitting.');
    }
  }

  async function api(payload) {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || !data?.ok) throw new Error(data?.error || 'The contest server could not complete the request.');
    return data;
  }

  function uploadPart(url, token, blob, completedBytes, totalBytes) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('x-upload-token', token);
      xhr.setRequestHeader('content-type', 'application/octet-stream');
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setProgress(Math.round(((completedBytes + event.loaded) / totalBytes) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('The upload server returned an invalid response.')); }
          return;
        }
        let detail = '';
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          detail = parsed?.message || parsed?.error || parsed?.code || '';
        } catch { detail = (xhr.responseText || '').trim(); }
        const suffix = detail ? ` Server response: ${detail}` : '';
        reject(new Error(`A video upload part failed (HTTP ${xhr.status}).${suffix}`));
      });
      xhr.addEventListener('error', () => reject(new Error('The original video upload was interrupted. Check your connection and try again.')));
      xhr.addEventListener('abort', () => reject(new Error('The original video upload was cancelled.')));
      xhr.send(blob);
    });
  }

  async function multipartUpload(entryId, token, file) {
    const start = await fetch(`${UPLOAD_API}/init`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, upload_token: token }), cache: 'no-store'
    });
    const startData = await start.json().catch(() => null);
    if (!start.ok || !startData?.ok) throw new Error(startData?.error || 'The secure upload could not be started.');

    const partSize = Number(startData.part_size);
    const parts = [];
    let completedBytes = 0;
    try {
      for (let offset = 0, partNumber = 1; offset < file.size; offset += partSize, partNumber += 1) {
        const blob = file.slice(offset, Math.min(offset + partSize, file.size));
        const query = new URLSearchParams({ entry_id: entryId, upload_id: startData.upload_id, part_number: String(partNumber) });
        const uploaded = await uploadPart(`${UPLOAD_API}/part?${query}`, token, blob, completedBytes, file.size);
        parts.push({ partNumber: uploaded.part_number, etag: uploaded.etag });
        completedBytes += blob.size;
        setProgress(Math.round((completedBytes / file.size) * 100));
      }
      const complete = await fetch(`${UPLOAD_API}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, upload_token: token, upload_id: startData.upload_id, parts }), cache: 'no-store'
      });
      const completeData = await complete.json().catch(() => null);
      if (!complete.ok || !completeData?.ok) throw new Error(completeData?.error || 'The uploaded video could not be assembled.');
    } catch (error) {
      fetch(`${UPLOAD_API}/abort`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, upload_token: token, upload_id: startData.upload_id }), keepalive: true
      }).catch(() => {});
      throw error;
    }
  }

  refreshAvailability();

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); setStatus('');
    if (!accepting) { setStatus('Contest submissions are not currently available. Refresh the page and try again.'); return; }
    if (Date.now() > contestClose) { accepting = false; setBusy(false); setStatus('The contest entry window has closed.'); return; }
    if (!form.checkValidity()) { form.reportValidity(); setStatus('Complete every required field and confirmation.'); return; }

    const file = fileInput?.files?.[0]; const title = titleInput?.value.trim() || '';
    if (!file) { setStatus('Select the original video file.'); fileInput?.focus(); return; }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setStatus(`This file is ${sizeMb} MB. The upload limit is 1 GB.`);
      fileInput?.focus(); return;
    }
    if (fileStem(file.name) !== title) { setStatus(`Rename the original file to exactly “${title}” before submitting.`); fileInput?.focus(); return; }

    const payload = { action:'init', entrant_name:value('entrant_name'), contact_email:value('contact_email'), social_handle:value('social_handle'), video_title:title, public_post_url:value('public_post_url'), wallet_address:value('wallet_address'), file_name:file.name, file_size:file.size, content_type:file.type||'video/mp4', hashtag_confirmed:checked('hashtag_confirmed'), dex_rocket_confirmed:checked('dex_rocket_confirmed'), likeness_assets_confirmed:checked('likeness_assets_confirmed'), originality_rights_confirmed:checked('originality_rights_confirmed'), ownership_transfer_confirmed:checked('ownership_transfer_confirmed'), vesting_confirmed:checked('vesting_confirmed'), eligibility_confirmed:checked('eligibility_confirmed') };

    setBusy(true); setProgress(0);
    try {
      setStatus('Preparing your secure original-file upload…');
      const init = await api(payload);
      setStatus('Uploading the original video… keep this page open.');
      await multipartUpload(init.entry_id, init.upload_token, file);
      setProgress(100); setStatus('Upload complete. Finalizing your official entry…');
      await api({ action:'finalize_r2', entry_id:init.entry_id, upload_token:init.upload_token });
      window.location.assign(`/video-contest-thanks.html?entry=${encodeURIComponent(init.entry_id)}`);
    } catch (error) {
      console.error(error); setStatus(error instanceof Error ? error.message : 'Submission failed. Please try again.'); setBusy(false);
    }
  });
})();

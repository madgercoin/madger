(() => {
  const form = document.getElementById('madger-contest-form');
  if (!form) return;

  const API = 'https://wtqcolceuvlxrelugvjw.supabase.co/functions/v1/madger-video-contest';
  const MAX_BYTES = 1024 * 1024 * 1024;
  const titleInput = document.getElementById('video_title');
  const fileInput = document.getElementById('original_file');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('contest-submit');
  const progress = document.getElementById('upload-progress');
  const progressBar = document.getElementById('upload-progress-bar');

  const setStatus = (message) => { if (status) status.textContent = message; };
  const setBusy = (busy) => {
    if (!submit) return;
    submit.disabled = busy;
    submit.textContent = busy ? 'Submitting…' : 'Submit Official Entry';
  };
  const setProgress = (value) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    if (progress) {
      progress.style.display = 'block';
      progress.setAttribute('aria-hidden', 'false');
    }
    if (progressBar) progressBar.style.width = `${pct}%`;
  };
  const fileStem = (name) => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  };
  const checked = (id) => Boolean(document.getElementById(id)?.checked);
  const value = (id) => document.getElementById(id)?.value.trim() || '';

  async function api(payload) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || !data?.ok) throw new Error(data?.error || 'The contest server could not complete the request.');
    return data;
  }

  function uploadToSignedUrl(signedUrl, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('The original video upload failed. Check your connection and try again.'));
      });
      xhr.addEventListener('error', () => reject(new Error('The original video upload was interrupted. Check your connection and try again.')));
      xhr.addEventListener('abort', () => reject(new Error('The original video upload was cancelled.')));
      const body = new FormData();
      body.append('cacheControl', '3600');
      body.append('', file);
      xhr.send(body);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Complete every required field and confirmation.');
      return;
    }

    const file = fileInput?.files?.[0];
    const title = titleInput?.value.trim() || '';
    if (!file) {
      setStatus('Select the original video file.');
      fileInput?.focus();
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setStatus('The original video must be 1 GB or smaller.');
      fileInput?.focus();
      return;
    }
    if (fileStem(file.name) !== title) {
      setStatus(`Rename the original file to exactly “${title}” before submitting.`);
      fileInput?.focus();
      return;
    }

    const payload = {
      action: 'init',
      entrant_name: value('entrant_name'),
      contact_email: value('contact_email'),
      social_handle: value('social_handle'),
      video_title: title,
      public_post_url: value('public_post_url'),
      wallet_address: value('wallet_address'),
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || 'video/mp4',
      hashtag_confirmed: checked('hashtag_confirmed'),
      dex_rocket_confirmed: checked('dex_rocket_confirmed'),
      telegram_boost_confirmed: checked('telegram_boost_confirmed'),
      likeness_assets_confirmed: checked('likeness_assets_confirmed'),
      originality_rights_confirmed: checked('originality_rights_confirmed'),
      ownership_transfer_confirmed: checked('ownership_transfer_confirmed'),
      vesting_confirmed: checked('vesting_confirmed'),
      eligibility_confirmed: checked('eligibility_confirmed')
    };

    setBusy(true);
    setProgress(0);
    try {
      setStatus('Preparing your secure original-file upload…');
      const init = await api(payload);
      setStatus('Uploading the original video… keep this page open.');
      await uploadToSignedUrl(init.signed_url, file);
      setProgress(100);
      setStatus('Upload complete. Finalizing your official entry…');
      await api({ action: 'finalize', entry_id: init.entry_id });
      window.location.assign(`/video-contest-thanks.html?entry=${encodeURIComponent(init.entry_id)}`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Submission failed. Please try again.');
      setBusy(false);
    }
  });
})();

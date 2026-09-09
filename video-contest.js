(() => {
  const form = document.getElementById('madger-contest-form');
  if (!form) return;

  const titleInput = document.getElementById('video_title');
  const fileInput = document.getElementById('original_file');
  const linkInput = document.getElementById('original_file_link');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('contest-submit');
  const maxDirectBytes = 10 * 1024 * 1024;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const fileStem = (name) => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  };

  form.addEventListener('submit', (event) => {
    setStatus('');

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      setStatus('Complete every required field and confirmation.');
      return;
    }

    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    const link = linkInput ? linkInput.value.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';

    if (!file && !link) {
      event.preventDefault();
      setStatus('Submit the original file or a public download link to it.');
      if (fileInput) fileInput.focus();
      return;
    }

    if (file) {
      if (file.size > maxDirectBytes) {
        event.preventDefault();
        setStatus('This attachment is over 10 MB. Use the original-file download link field instead.');
        if (linkInput) linkInput.focus();
        return;
      }
      if (fileStem(file.name) !== title) {
        event.preventDefault();
        setStatus(`Rename the original file to exactly “${title}” before submitting.`);
        if (fileInput) fileInput.focus();
        return;
      }
    }

    if (link && !/^https:\/\//i.test(link)) {
      event.preventDefault();
      setStatus('The original-file link must begin with https:// and allow direct access without requesting permission.');
      if (linkInput) linkInput.focus();
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Submitting…';
    }
    setStatus('Sending your official entry…');
  });
})();

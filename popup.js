document.addEventListener('DOMContentLoaded', () => {
    const extensionToggle = document.getElementById('extension-toggle');
    const hintsToggle = document.getElementById('hints-toggle');
    const attacksToggle = document.getElementById('attacks-toggle');
    const saveBtn = document.getElementById('save-btn');
  
    // Load current settings (default values: enabled)
    chrome.storage.sync.get({
      extensionEnabled: true,
      highlightHints: true,
      highlightAttacks: true
    }, (items) => {
      extensionToggle.checked = items.extensionEnabled;
      hintsToggle.checked = items.highlightHints;
      attacksToggle.checked = items.highlightAttacks;
    });
  
    // When the main extension toggle changes, update the feature toggles accordingly.
    extensionToggle.addEventListener('change', () => {
      if (extensionToggle.checked) {
        // If extension is enabled, force both feature toggles to be enabled.
        hintsToggle.checked = true;
        attacksToggle.checked = true;
      } else {
        // If extension is disabled, force both feature toggles to be disabled.
        hintsToggle.checked = false;
        attacksToggle.checked = false;
      }
    });
  
    // When either feature toggle changes, update the master toggle.
    function updateMasterToggle() {
      if (!hintsToggle.checked && !attacksToggle.checked) {
        extensionToggle.checked = false;
      } else {
        extensionToggle.checked = true;
      }
    }
  
    hintsToggle.addEventListener('change', updateMasterToggle);
    attacksToggle.addEventListener('change', updateMasterToggle);
  
    // Toast function to display a custom notification message
    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Allow the toast to render before adding the "show" class
      setTimeout(() => {
        toast.classList.add('show');
      }, 100);
      
      // Remove the toast after 2 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 2000);
    }
  
    saveBtn.addEventListener('click', () => {
      chrome.storage.sync.set({
        extensionEnabled: extensionToggle.checked,
        highlightHints: hintsToggle.checked,
        highlightAttacks: attacksToggle.checked
      }, () => {
        showToast('Settings saved');
      });
    });
  });
  
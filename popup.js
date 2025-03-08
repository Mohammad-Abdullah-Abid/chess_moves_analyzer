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
  
    // When a feature toggle is enabled, automatically enable the extension.
    hintsToggle.addEventListener('change', () => {
      if (hintsToggle.checked) {
        extensionToggle.checked = true;
      }
    });
  
    attacksToggle.addEventListener('change', () => {
      if (attacksToggle.checked) {
        extensionToggle.checked = true;
      }
    });
  
    saveBtn.addEventListener('click', () => {
      chrome.storage.sync.set({
        extensionEnabled: extensionToggle.checked,
        highlightHints: hintsToggle.checked,
        highlightAttacks: attacksToggle.checked
      }, () => {
        alert('Settings saved.');
      });
    });
  });
  
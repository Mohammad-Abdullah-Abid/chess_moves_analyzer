document.addEventListener("DOMContentLoaded", function () {
    let toggleCheckbox = document.getElementById("toggleHighlight");

    // Load the setting
    chrome.storage.sync.get("highlightEnabled", function (data) {
        toggleCheckbox.checked = data.highlightEnabled ?? true;
    });

    // Listen for toggle changes
    toggleCheckbox.addEventListener("change", function () {
        chrome.storage.sync.set({ highlightEnabled: toggleCheckbox.checked });
        
        // Send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: toggleHighlighting,
                args: [toggleCheckbox.checked]
            });
        });
    });
});

// Function injected into the webpage
function toggleHighlighting(enabled) {
    localStorage.setItem("chessCoverageEnabled", enabled);
    window.location.reload(); // Reload the page to apply changes
}

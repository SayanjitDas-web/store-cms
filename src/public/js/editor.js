document.addEventListener('DOMContentLoaded', function () {
    const editor = document.getElementById('editor');
    const hiddenInput = document.getElementById('content');
    const form = document.querySelector('form'); // Assuming one form per page for now

    if (!editor || !hiddenInput) return;

    // Initialize content from hidden input if editor is empty but input has value (Edge case)
    if (editor.innerHTML.trim() === '' && hiddenInput.value.trim() !== '') {
        editor.innerHTML = hiddenInput.value;
    }

    // Command Execution
    window.formatDoc = function (cmd, value = null) {
        if (value) {
            document.execCommand(cmd, false, value);
        } else {
            document.execCommand(cmd);
        }
        editor.focus();
    };

    // Auto-update hidden input
    editor.addEventListener('input', function () {
        hiddenInput.value = editor.innerHTML;
    });

    // Ensure value is synced on submit
    if (form) {
        form.addEventListener('submit', function () {
            hiddenInput.value = editor.innerHTML;
        });
    }
});

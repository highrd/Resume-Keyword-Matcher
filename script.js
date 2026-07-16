// script.js
const fileInput = document.getElementById('fileInput');
const fileContent = document.getElementById('fileContent');

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0]; // Get the selected file
    
    if (file) {
        const reader = new FileReader();

        // Define what happens once the file is read
        reader.onload = function(e) {
            fileContent.textContent = e.target.result; // Displays file text
        };

        // Read the file as plain text
        reader.readAsText(file);
    }
});

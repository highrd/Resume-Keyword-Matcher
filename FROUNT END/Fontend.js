document.getElementById("resumeFile").addEventListener("change", function (event) {
  const file = event.target.files[0]; 
 
  if (!file) return; 
 
  const reader = new FileReader(); 
 
  reader.onload = function (e) {
    document.getElementById("resumeText").value = e.target.result;
  };
 
  reader.readAsText(file);
});
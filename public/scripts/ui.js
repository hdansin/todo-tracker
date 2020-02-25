// UI Scripts
function showTaskActions() {
  // Get taskActions
  let deleteTask = document.getElementById("deleteTask");
  let duplicateTask = document.getElementById("duplicateTask");
  let showEditForm = document.getElementById("showEditForm");
  // Toggle visibility
  if (deleteTask.style.visibility !== 'visible') {
    deleteTask.style.visibility = 'visible';
    duplicateTask.style.visibility = 'visible';
    showEditForm.style.visibility = 'visible';
  }
  else {
    deleteTask.style.visibility = 'hidden';
    duplicateTask.style.visibility = 'hidden';
    showEditForm.style.visibility = 'hidden';
  }
}

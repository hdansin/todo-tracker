// UI Scripts
// eslint-disable-next-line no-unused-vars
function showTaskActions(taskId) {
  // Get taskActions
  console.log(taskId);
  let deleteTask = document.getElementById("deleteTask" + taskId);
  let duplicateTask = document.getElementById("duplicateTask" + taskId);
  let showEditForm = document.getElementById("showEditForm" + taskId);
  // Toggle visibility
  if (deleteTask.style.visibility === "visible") {
    deleteTask.style.visibility = "hidden";
    duplicateTask.style.visibility = "hidden";
    showEditForm.style.visibility = "hidden";
  } else {
    deleteTask.style.visibility = "visible";
    duplicateTask.style.visibility = "visible";
    showEditForm.style.visibility = "visible";
  }
}

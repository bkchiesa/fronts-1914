/* Boot Fronts, 1914 */
document.addEventListener("DOMContentLoaded", () => {
  Art.loadAll().then(() => {
    UI.init();
    console.log("Fronts, 1914 ready");
  });
});

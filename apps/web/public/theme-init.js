// Apply the stored edition before rendering; migrate legacy preferences in React.
try {
  const preference =
    localStorage.getItem("techspill.theme") ||
    localStorage.getItem("techpulse.theme");
  document.documentElement.dataset.theme =
    preference === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

const menuToggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle("is-open", isOpen);
  sidebarBackdrop.hidden = !isOpen;
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

menuToggle.addEventListener("click", function () {
  setSidebarOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

sidebarBackdrop.addEventListener("click", function () {
  setSidebarOpen(false);
});

document.querySelectorAll(".main-nav a").forEach(function (link) {
  const isCurrent = link.dataset.page === (window.location.pathname.split("/").pop() || "index.html");
  link.classList.toggle("is-active", isCurrent);

  if (isCurrent) {
    link.setAttribute("aria-current", "page");
  }

  link.addEventListener("click", function () {
    setSidebarOpen(false);
  });
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    setSidebarOpen(false);
  }
});

function updateStudentProfile(name) {
  const headerName = document.querySelector("#header-student-name");
  const avatar = document.querySelector(".avatar");
  const initials = name.trim().split(/\s+/).slice(0, 2).map(function (part) {
    return part.charAt(0);
  }).join("").toUpperCase();

  headerName.textContent = "Olá, " + name;
  avatar.textContent = initials;
}

window.hubUpdateStudentProfile = updateStudentProfile;

try {
  const savedCommunity = window.localStorage.getItem("hub-estudos:community:v1");
  if (savedCommunity !== null) {
    const community = JSON.parse(savedCommunity);
    if (
      community !== null &&
      typeof community.participantName === "string" &&
      community.participantName.trim() !== ""
    ) {
      updateStudentProfile(community.participantName === "Hub de Estudos" ? "ISA" : community.participantName);
    }
  }
} catch (error) {
  updateStudentProfile("ISA");
}

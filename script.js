const API = "/api";

// Registration
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      message.textContent = data.message;

      if (response.ok) {
        registerForm.reset();
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1000);
      }
    } catch (error) {
      message.textContent = "Unable to connect to the server.";
    }
  });
}

// Login
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
      const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("soundspaceToken", data.token);
        localStorage.setItem("soundspaceName", data.name);
        window.location.href = "index.html";
      } else {
        message.textContent = data.message;
      }
    } catch (error) {
      message.textContent = "Unable to connect to the server.";
    }
  });
}

// Dashboard authentication
const musicResults = document.getElementById("musicResults");

if (musicResults) {
  const token = localStorage.getItem("soundspaceToken");

  if (!token) {
    window.location.href = "login.html";
  } else {
    document.getElementById("welcome").textContent =
      `Welcome, ${localStorage.getItem("soundspaceName") || "User"}`;
  }

  // Search music
  const searchForm = document.getElementById("searchForm");

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = document.getElementById("searchInput").value.trim();
    const message = document.getElementById("searchMessage");

    if (!query) return;

    musicResults.innerHTML = "";
    message.textContent = "Searching for music...";

    try {
      const response = await fetch(
        `${API}/music?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        message.textContent = data.message || "Search failed.";
        return;
      }

      message.textContent = data.length
        ? `Found ${data.length} results`
        : "No music found.";

      data.forEach(song => {
        const card = document.createElement("div");
        card.className = "music-card";

        const image = document.createElement("img");
        image.src = song.thumbnail;
        image.alt = "Video thumbnail";

        const title = document.createElement("h3");
        title.textContent = song.title;

        const artist = document.createElement("p");
        artist.textContent = song.artist;

        const link = document.createElement("a");
        link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(song.id)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Watch on YouTube";

        card.append(image, title, artist, link);
        musicResults.appendChild(card);
      });
    } catch (error) {
      message.textContent = "Unable to search. Check your connection.";
    }
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("soundspaceToken");
    localStorage.removeItem("soundspaceName");
    window.location.href = "login.html";
  });
}

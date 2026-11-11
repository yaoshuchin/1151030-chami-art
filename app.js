// Application Logic for 20261102 Share Bar Gallery

const CORRECT_PASSWORD = "nato";

// State
let allPosts = [];
let filteredPosts = [];
let currentLightboxIndex = -1;
let currentZoom = 1;
let likedPostIds = new Set();

// Color palette for student avatars
const AVATAR_COLORS = [
  "linear-gradient(135deg, #f43f5e, #be123c)",
  "linear-gradient(135deg, #ec4899, #be185d)",
  "linear-gradient(135deg, #d946ef, #a21caf)",
  "linear-gradient(135deg, #a855f7, #7e22ce)",
  "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "linear-gradient(135deg, #6366f1, #4338ca)",
  "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  "linear-gradient(135deg, #0ea5e9, #0369a1)",
  "linear-gradient(135deg, #06b6d4, #0e7490)",
  "linear-gradient(135deg, #14b8a6, #0f766e)",
  "linear-gradient(135deg, #10b981, #047857)",
  "linear-gradient(135deg, #84cc16, #4d7c0f)",
  "linear-gradient(135deg, #eab308, #a16207)",
  "linear-gradient(135deg, #f97316, #c2410c)",
  "linear-gradient(135deg, #ef4444, #b91c1c)"
];

function getAvatarStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitial(name) {
  const clean = name.replace(/^[\d\s.\-_]+/, "") || name;
  return clean.charAt(0) || "🎨";
}

// Format relative date
function formatDate(dateStr) {
  if (!dateStr) return "2026/11/02";
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  } catch (e) {
    return "2026/11/02";
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Check password authentication state
  initAuth();

  // Load theme preference
  initTheme();

  // Load liked posts from localStorage
  try {
    const saved = localStorage.getItem("liked_posts");
    if (saved) likedPostIds = new Set(JSON.parse(saved));
  } catch (e) {}

  // Load posts data
  if (window.__BOARD_DATA__ && window.__BOARD_DATA__.posts) {
    allPosts = window.__BOARD_DATA__.posts;
    filteredPosts = [...allPosts];
    initBoard();
  }

  // Keyboard navigation
  window.addEventListener("keydown", handleKeyDown);
});

// Authentication Handling
function initAuth() {
  const isUnlocked = sessionStorage.getItem("board_unlocked") === "true";
  const gate = document.getElementById("passwordGate");
  const container = document.getElementById("appContainer");

  if (isUnlocked) {
    gate.classList.add("unlocked");
    container.classList.remove("locked");
  } else {
    gate.classList.remove("unlocked");
    container.classList.add("locked");
    setTimeout(() => {
      document.getElementById("passwordInput")?.focus();
    }, 100);
  }
}

function handlePasswordSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("passwordInput");
  const error = document.getElementById("passwordError");
  const pwd = input.value.trim();

  if (pwd.toLowerCase() === CORRECT_PASSWORD.toLowerCase()) {
    sessionStorage.setItem("board_unlocked", "true");
    const gate = document.getElementById("passwordGate");
    const container = document.getElementById("appContainer");
    
    gate.classList.add("unlocked");
    container.classList.remove("locked");
    error.textContent = "";
    
    // Refresh Lucide icons
    if (window.lucide) window.lucide.createIcons();
  } else {
    error.textContent = "密碼錯誤，請重新輸入！(提示：nato)";
    input.select();
    input.focus();
    
    // Shake animation
    const card = document.querySelector(".password-card");
    card.style.animation = "none";
    card.offsetHeight; // trigger reflow
    card.style.animation = "shake 0.4s ease";
  }
}

// Add shake keyframes dynamically
const styleSheet = document.createElement("style");
styleSheet.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
`;
document.head.appendChild(styleSheet);

function lockBoard() {
  sessionStorage.removeItem("board_unlocked");
  initAuth();
}

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem("board_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
  }
  updateThemeIcon();
}

function toggleTheme() {
  if (document.body.classList.contains("light-theme")) {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    localStorage.setItem("board_theme", "dark");
  } else {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    localStorage.setItem("board_theme", "light");
  }
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.getElementById("themeIcon");
  if (!icon) return;
  const isLight = document.body.classList.contains("light-theme");
  icon.setAttribute("data-lucide", isLight ? "moon" : "sun");
  if (window.lucide) window.lucide.createIcons();
}

// Board Initialization
function initBoard() {
  document.getElementById("postCount").textContent = allPosts.length;

  // Collect authors
  const authors = [...new Set(allPosts.map(p => p.name))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  document.getElementById("authorCount").textContent = authors.length;

  const select = document.getElementById("authorFilter");
  authors.forEach(auth => {
    const opt = document.createElement("option");
    opt.value = auth;
    opt.textContent = auth;
    select.appendChild(opt);
  });

  // Event Listeners
  document.getElementById("searchInput").addEventListener("input", handleSearchInput);
  document.getElementById("clearSearchBtn").addEventListener("click", clearSearch);
  document.getElementById("authorFilter").addEventListener("change", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", applyFilters);
  document.getElementById("btnGrid").addEventListener("click", () => setLayout("grid"));
  document.getElementById("btnColumns").addEventListener("click", () => setLayout("columns"));
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("lockBtn").addEventListener("click", lockBoard);
  document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);

  // Lightbox Controls
  document.getElementById("lightboxCloseBtn").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrevBtn").addEventListener("click", () => navigateLightbox(-1));
  document.getElementById("lightboxNextBtn").addEventListener("click", () => navigateLightbox(1));
  document.getElementById("zoomInBtn").addEventListener("click", () => setZoom(currentZoom + 0.25));
  document.getElementById("zoomOutBtn").addEventListener("click", () => setZoom(currentZoom - 0.25));
  document.getElementById("zoomResetBtn").addEventListener("click", () => setZoom(1));
  document.getElementById("lightboxLikeBtn").addEventListener("click", toggleLightboxLike);

  renderPosts();
}

// Filter & Sort
function handleSearchInput(e) {
  const val = e.target.value.trim();
  const clearBtn = document.getElementById("clearSearchBtn");
  if (val) {
    clearBtn.classList.remove("hidden");
  } else {
    clearBtn.classList.add("hidden");
  }
  applyFilters();
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  input.value = "";
  document.getElementById("clearSearchBtn").classList.add("hidden");
  applyFilters();
  input.focus();
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("clearSearchBtn").classList.add("hidden");
  document.getElementById("authorFilter").value = "";
  document.getElementById("sortSelect").value = "original";
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const selectedAuthor = document.getElementById("authorFilter").value;
  const sortMode = document.getElementById("sortSelect").value;

  filteredPosts = allPosts.filter(p => {
    // Author filter
    if (selectedAuthor && p.name !== selectedAuthor) return false;

    // Search query
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchTitle = p.title.toLowerCase().includes(query);
      const matchBody = p.body.toLowerCase().includes(query);
      const matchComments = p.comments.some(c => 
        (c.name && c.name.toLowerCase().includes(query)) || 
        (c.body && c.body.toLowerCase().includes(query))
      );
      if (!matchName && !matchTitle && !matchBody && !matchComments) return false;
    }
    return true;
  });

  // Sorting
  if (sortMode === "likes") {
    filteredPosts.sort((a, b) => (b.likes + (likedPostIds.has(b.id) ? 1 : 0)) - (a.likes + (likedPostIds.has(a.id) ? 1 : 0)));
  } else if (sortMode === "comments") {
    filteredPosts.sort((a, b) => b.commentsCount - a.commentsCount);
  } else if (sortMode === "author") {
    filteredPosts.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  } else {
    // Original order
    filteredPosts.sort((a, b) => a.order - b.order);
  }

  // Update stats text
  const statsText = document.getElementById("filterStatsText");
  if (filteredPosts.length === allPosts.length) {
    statsText.textContent = `顯示所有作品 (共 ${allPosts.length} 件)`;
  } else {
    statsText.textContent = `顯示 ${allPosts.length} 件中的 ${filteredPosts.length} 件符合條件的作品`;
  }

  renderPosts();
}

function setLayout(mode) {
  const grid = document.getElementById("postsGrid");
  const btnGrid = document.getElementById("btnGrid");
  const btnCols = document.getElementById("btnColumns");

  if (mode === "columns") {
    grid.classList.add("columns-mode");
    btnCols.classList.add("active");
    btnGrid.classList.remove("active");
  } else {
    grid.classList.remove("columns-mode");
    btnGrid.classList.add("active");
    btnCols.classList.remove("active");
  }
}

// Render Posts
function renderPosts() {
  const container = document.getElementById("postsGrid");
  const emptyState = document.getElementById("emptyState");
  container.innerHTML = "";

  if (filteredPosts.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  const frag = document.createDocumentFragment();

  filteredPosts.forEach((post, idx) => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.dataset.index = idx;

    const hasImage = post.images && post.images.length > 0;
    const isLiked = likedPostIds.has(post.id);
    const displayLikes = post.likes + (isLiked ? 1 : 0);

    // Build Card HTML
    card.innerHTML = `
      <div class="card-header">
        <div class="author-avatar" style="background: ${getAvatarStyle(post.name)}">
          ${getInitial(post.name)}
        </div>
        <div class="card-author-info">
          <div class="card-author-name" title="${escapeHtml(post.name)}">${escapeHtml(post.name)}</div>
          <div class="card-date">${formatDate(post.createdAt)}</div>
        </div>
      </div>

      ${hasImage ? `
        <div class="card-media" onclick="openLightbox(${idx})">
          <img src="${post.images[0]}" alt="${escapeHtml(post.title || post.name)}" loading="lazy" />
          <div class="media-overlay">
            <i data-lucide="zoom-in"></i>
          </div>
        </div>
      ` : ''}

      <div class="card-body">
        ${post.title ? `<h3 class="card-title">${escapeHtml(post.title)}</h3>` : ''}
        ${post.body ? `<p class="card-text">${escapeHtml(post.body)}</p>` : ''}
        ${post.link ? `
          <a href="${post.link}" target="_blank" rel="noopener noreferrer" class="card-link" onclick="event.stopPropagation()">
            <i data-lucide="external-link"></i> ${escapeHtml(post.link)}
          </a>
        ` : ''}
      </div>

      <div class="card-footer">
        <div class="card-actions">
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleCardLike(event, '${post.id}', ${idx})" title="點讚作品">
            <i data-lucide="heart"></i>
            <span class="like-count">${displayLikes}</span>
          </button>
          <button class="action-btn comment-btn" onclick="openLightbox(${idx})" title="查看討論">
            <i data-lucide="message-circle"></i>
            <span>${post.commentsCount}</span>
          </button>
        </div>
      </div>

      ${post.comments && post.comments.length > 0 ? `
        <div class="card-comments-preview" onclick="openLightbox(${idx})">
          ${post.comments.slice(0, 2).map(c => `
            <div class="mini-comment">
              <strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.body)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    frag.appendChild(card);
  });

  container.appendChild(frag);
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Like functionality
function toggleCardLike(e, postId, filteredIdx) {
  e.stopPropagation();
  toggleLike(postId);
  
  // Re-render specific card's like state
  const post = filteredPosts[filteredIdx];
  if (post && post.id === postId) {
    const isLiked = likedPostIds.has(postId);
    const count = post.likes + (isLiked ? 1 : 0);
    const card = document.querySelector(`.post-card[data-index="${filteredIdx}"]`);
    if (card) {
      const btn = card.querySelector(".like-btn");
      if (btn) {
        btn.classList.toggle("liked", isLiked);
        btn.querySelector(".like-count").textContent = count;
      }
    }
  }
}

function toggleLightboxLike() {
  if (currentLightboxIndex < 0 || currentLightboxIndex >= filteredPosts.length) return;
  const post = filteredPosts[currentLightboxIndex];
  toggleLike(post.id);
  updateLightboxLikes(post);
  
  // Also sync the card behind
  renderPosts();
}

function toggleLike(postId) {
  if (likedPostIds.has(postId)) {
    likedPostIds.delete(postId);
  } else {
    likedPostIds.add(postId);
  }
  try {
    localStorage.setItem("liked_posts", JSON.stringify([...likedPostIds]));
  } catch (e) {}
}

function updateLightboxLikes(post) {
  const isLiked = likedPostIds.has(post.id);
  const count = post.likes + (isLiked ? 1 : 0);
  const btn = document.getElementById("lightboxLikeBtn");
  btn.classList.toggle("liked", isLiked);
  document.getElementById("lightboxLikeCount").textContent = count;
}

// Lightbox Modal
function openLightbox(idx) {
  if (idx < 0 || idx >= filteredPosts.length) return;
  currentLightboxIndex = idx;
  currentZoom = 1;

  const post = filteredPosts[idx];
  const modal = document.getElementById("lightboxModal");
  const imgEl = document.getElementById("lightboxImg");

  // Populate data
  if (post.images && post.images.length > 0) {
    imgEl.src = post.images[0];
    imgEl.style.display = "block";
    document.getElementById("downloadImgBtn").href = post.images[0];
    document.getElementById("downloadImgBtn").setAttribute("download", `${post.name}_artwork.jpg`);
    document.querySelector(".lightbox-zoom-bar").style.display = "flex";
  } else {
    imgEl.style.display = "none";
    document.querySelector(".lightbox-zoom-bar").style.display = "none";
  }

  setZoom(1);

  // Author & Date
  const avatarEl = document.getElementById("lightboxAvatar");
  avatarEl.style.background = getAvatarStyle(post.name);
  avatarEl.textContent = getInitial(post.name);
  document.getElementById("lightboxAuthorName").textContent = post.name;
  document.getElementById("lightboxDate").textContent = formatDate(post.createdAt);

  // Content
  document.getElementById("lightboxTitle").textContent = post.title || "";
  document.getElementById("lightboxBody").textContent = post.body || "";

  // Link
  const linkWrap = document.getElementById("lightboxLinkWrap");
  const linkEl = document.getElementById("lightboxLink");
  if (post.link) {
    linkEl.href = post.link;
    linkWrap.classList.remove("hidden");
  } else {
    linkWrap.classList.add("hidden");
  }

  // Likes & comments
  updateLightboxLikes(post);
  document.getElementById("lightboxCommentCount").textContent = post.commentsCount;

  // Comments list
  const commentsList = document.getElementById("lightboxCommentsList");
  commentsList.innerHTML = "";
  if (post.comments && post.comments.length > 0) {
    post.comments.forEach(c => {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <div class="comment-author">${escapeHtml(c.name)}</div>
        <div class="comment-body">${escapeHtml(c.body)}</div>
      `;
      commentsList.appendChild(item);
    });
  } else {
    commentsList.innerHTML = `<span class="no-comments-tip">尚無留言討論</span>`;
  }

  // Update navigation buttons
  document.getElementById("lightboxPrevBtn").style.display = idx > 0 ? "flex" : "none";
  document.getElementById("lightboxNextBtn").style.display = idx < filteredPosts.length - 1 ? "flex" : "none";

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (window.lucide) window.lucide.createIcons();
}

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  currentLightboxIndex = -1;
}

function handleLightboxBgClick(e) {
  if (e.target.id === "lightboxModal") {
    closeLightbox();
  }
}

function navigateLightbox(dir) {
  const newIndex = currentLightboxIndex + dir;
  if (newIndex >= 0 && newIndex < filteredPosts.length) {
    openLightbox(newIndex);
  }
}

function setZoom(val) {
  currentZoom = Math.min(Math.max(val, 0.5), 3);
  const imgEl = document.getElementById("lightboxImg");
  imgEl.style.transform = `scale(${currentZoom})`;
}

function handleKeyDown(e) {
  const modal = document.getElementById("lightboxModal");
  if (!modal || modal.classList.contains("hidden")) return;

  if (e.key === "Escape") {
    closeLightbox();
  } else if (e.key === "ArrowLeft") {
    navigateLightbox(-1);
  } else if (e.key === "ArrowRight") {
    navigateLightbox(1);
  }
}

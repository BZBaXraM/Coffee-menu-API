const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const demoRoot = document.querySelector("[data-menu-demo]");

if (demoRoot) {
  initMenuDemo();
}

async function initMenuDemo() {
  const categoryRoot = document.querySelector("[data-demo-categories]");
  const grid = document.querySelector("[data-demo-grid]");
  const loading = document.querySelector("[data-demo-loading]");

  try {
    const [categoryResponse, dishResponse] = await Promise.all([
      fetch("/api/menu/categories"),
      fetch("/api/menu/dishes?limit=50"),
    ]);

    if (!categoryResponse.ok || !dishResponse.ok) {
      throw new Error("Menu API unavailable");
    }

    const categories = await categoryResponse.json();
    const dishPayload = await dishResponse.json();
    const dishes = Array.isArray(dishPayload.items) ? dishPayload.items : [];
    renderMenuDemo(categoryRoot, grid, categories, dishes);
  } catch (error) {
    renderMenuDemo(categoryRoot, grid, fallbackCategories, fallbackDishes);
  } finally {
    if (loading) loading.remove();
  }
}

function renderMenuDemo(categoryRoot, grid, categories, dishes) {
  if (!categoryRoot || !grid) return;

  let selectedCategory = "all";
  const normalizedCategories = [
    { id: "all", label: "Hamısı" },
    ...categories.map((category) => ({
      id: String(category.id),
      label: `${category.icon || ""} ${localize(category.name)}`.trim(),
    })),
  ];

  function renderCategories() {
    categoryRoot.innerHTML = normalizedCategories
      .map(
        (category) => `
          <button class="${category.id === selectedCategory ? "is-active" : ""}" type="button" data-category="${escapeHtml(category.id)}">
            ${escapeHtml(category.label)}
          </button>
        `,
      )
      .join("");
  }

  function renderDishes() {
    const visibleDishes =
      selectedCategory === "all"
        ? dishes
        : dishes.filter((dish) => String(dish.category_id) === selectedCategory);

    if (!visibleDishes.length) {
      grid.innerHTML = '<div class="empty-state">Bu kateqoriyada məhsul tapılmadı.</div>';
      return;
    }

    grid.innerHTML = visibleDishes
      .map((dish) => {
        const name = localize(dish.name);
        const description = localize(dish.description) || "Təzə hazırlanmış Coffee In Lab seçimi.";
        const image = dish.image || fallbackImageFor(name);
        return `
          <article class="menu-card">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='../drink-photo/cappuccino.png';" />
            <div class="menu-card-body">
              <div class="menu-card-top">
                <h2>${escapeHtml(name)}</h2>
                <span class="menu-price">${formatPrice(dish)}</span>
              </div>
              <p>${escapeHtml(description)}</p>
            </div>
          </article>
        `;
      })
      .join("");
  }

  categoryRoot.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderCategories();
    renderDishes();
  });

  renderCategories();
  renderDishes();
}

function localize(value) {
  if (value == null) return "";
  if (typeof value !== "string") return String(value);

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed.az || parsed.en || parsed.tr || parsed.ru || Object.values(parsed)[0] || "";
    }
  } catch (error) {
    return value;
  }

  return value;
}

function formatPrice(dish) {
  const sizes = parseSizes(dish.sizes);
  const price = sizes.length ? Math.min(...sizes.map((size) => Number(size.price))) : Number(dish.price);
  if (!Number.isFinite(price)) return "₼";
  return `${price.toFixed(price % 1 === 0 ? 0 : 2)} ₼`;
}

function parseSizes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function fallbackImageFor(name) {
  const lower = name.toLowerCase();
  if (lower.includes("cold")) return "../drink-photo/cold_brew.png";
  if (lower.includes("cheese")) return "../drink-photo/cheesecake.png";
  if (lower.includes("milkshake")) return "../drink-photo/vanilla_milkshake.png";
  if (lower.includes("tea")) return "../drink-photo/green_tea.png";
  return "../drink-photo/cappuccino.png";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const fallbackCategories = [
  { id: 1, name: "Espresso" },
  { id: 2, name: "Soyuq içkilər" },
  { id: 3, name: "Desertlər" },
];

const fallbackDishes = [
  {
    id: 1,
    category_id: 1,
    name: "Cappuccino",
    description: "Espresso, isti süd və yumşaq köpük.",
    price: 4.5,
    image: "../drink-photo/cappuccino.png",
  },
  {
    id: 2,
    category_id: 2,
    name: "Cold Brew",
    description: "12 saat dəmlənmiş soyuq qəhvə.",
    price: 4.5,
    image: "../drink-photo/cold_brew.png",
  },
  {
    id: 3,
    category_id: 3,
    name: "Cheesecake",
    description: "Klassik, kremli və yüngül desert.",
    price: 4.5,
    image: "../drink-photo/cheesecake.png",
  },
];

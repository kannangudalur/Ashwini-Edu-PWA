let currentCategory = 'all';

function applyFilters() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  const items = document.querySelectorAll('.content-item');

  items.forEach(item => {
    const matchesCategory = (currentCategory === 'all' || item.classList.contains(currentCategory));
    const text = item.innerText.toLowerCase();
    const matchesSearch = text.includes(input);

    if (matchesCategory && matchesSearch) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

function filterItems(category) {
  currentCategory = category;

  const buttons = document.querySelectorAll('.filter-buttons button');
  buttons.forEach(btn => btn.classList.remove('active'));

  if (event && event.target && event.target.tagName === 'BUTTON') {
    event.target.classList.add('active');
  } else {
    document.querySelector("button[onclick=\"filterItems('all')\"]").classList.add('active');
  }

  applyFilters();
}

function searchItems() {
  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  filterItems('all');
});

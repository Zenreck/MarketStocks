// index.js
const marketActivityUrl = 'https://www.rolimons.com/api/activity';

async function fetchAndDisplayMarketActivity() {
  try {
    const response = await fetch(marketActivityUrl);
    const data = await response.json();
    const container = document.getElementById('market-activity');

    // Example of how to display data.
    // You would need to inspect the data structure and build the HTML dynamically.
    if (data.activity && data.activity.length > 0) {
      container.innerHTML = '<h3>Rolimons Market Activity</h3>';
      data.activity.forEach(entry => {
        const p = document.createElement('p');
        p.textContent = `User ${entry.userId} traded item ${entry.itemId} for ${entry.value}`;
        container.appendChild(p);
      });
    } else {
      container.textContent = 'No market activity found.';
    }

  } catch (error) {
    console.error('Failed to fetch market activity:', error);
    const container = document.getElementById('market-activity');
    container.textContent = 'Failed to load market activity. Please try again later.';
  }
}

fetchAndDisplayMarketActivity();


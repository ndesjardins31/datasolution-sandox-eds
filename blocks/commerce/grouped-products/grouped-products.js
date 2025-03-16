import { fetchGraphQL } from '../../../scripts/commerce.js';

export default async function decorate(block) {
  // Récupérer l'ID du produit depuis les data attributes ou les paramètres
  const productId = block.dataset.productId;

  // Requête GraphQL
  const query = `
    query GetGroupedProductDetails($productId: String!) {
      groupedProducts(productId: $productId) {
        id
        size
        color
        price
        stock_status
      }
    }
  `;

  try {
    const response = await fetchGraphQL(query, { productId });
    const { groupedProducts } = response.data;

    // Extraire les tailles et couleurs uniques
    const sizes = [...new Set(groupedProducts.map(product => product.size))];
    const colors = [...new Set(groupedProducts.map(product => product.color))];

    // Créer la map des produits
    const productMap = {};
    groupedProducts.forEach(product => {
      if (!productMap[product.color]) {
        productMap[product.color] = {};
      }
      productMap[product.color][product.size] = product;
    });

    // Créer le tableau HTML
    const table = document.createElement('table');
    table.className = 'grouped-products-table';

    // Créer l'en-tête
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th></th>${sizes.map(size => `<th>${size}</th>`).join('')}`;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Créer le corps du tableau
    const tbody = document.createElement('tbody');
    colors.forEach(color => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${color}</td>
        ${sizes.map(size => `
          <td>
            ${productMap[color][size] ? `
              <div class="product-cell">
                <input 
                  type="number" 
                  min="0" 
                  value="0"
                  data-product-id="${productMap[color][size].id}"
                />
                <span class="price">${productMap[color][size].price}€</span>
              </div>
            ` : ''}
          </td>
        `).join('')}
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Ajouter les écouteurs d'événements
    table.addEventListener('change', (e) => {
      if (e.target.tagName === 'INPUT') {
        const productId = e.target.dataset.productId;
        const quantity = e.target.value;
        // Ici, ajoutez votre logique pour mettre à jour le panier
        console.log(`Produit ${productId}: quantité ${quantity}`);
      }
    });

    // Remplacer le contenu du bloc par le tableau
    block.innerHTML = '';
    block.appendChild(table);

  } catch (error) {
    console.error('Erreur lors du chargement des produits groupés:', error);
    block.innerHTML = '<div class="error">Erreur lors du chargement des produits</div>';
  }
}
import { fetchGraphQL } from '../../../scripts/commerce.js';

export default async function decorate(block) {
  console.log('Decorating grouped products block');
  const productId = block.dataset.productId;
  console.log('Product ID:', productId);

  // Requête GraphQL simplifiée
  const query = `
    query GetGroupedProductDetails($productId: String!) {
      product(id: $productId) {
        id
        sku
        name
        options {
          id
          type
          label
          items {
            id
            label
            product {
              sku
              name
              price {
                final {
                  amount {
                    value
                    currency
                  }
                }
              }
              inStock
            }
          }
        }
      }
    }
  `;

  try {
    console.log('Fetching data with query:', query);
    const response = await fetchGraphQL(query, { productId });
    console.log('GraphQL Response:', response);

    if (!response.data?.product) {
      throw new Error('No product data received');
    }

    const options = response.data.product.options?.[0]?.items || [];
    console.log('Product options:', options);

    // Extraire les tailles et couleurs des labels
    const products = options.map(item => ({
      sku: item.product.sku,
      name: item.product.name,
      price: item.product.price.final.amount.value,
      currency: item.product.price.final.amount.currency,
      inStock: item.product.inStock,
      // Extraire taille et couleur du nom du produit
      size: item.product.name.split('-')[1],
      color: item.product.name.split('-')[2]
    }));

    const sizes = [...new Set(products.map(p => p.size))].sort();
    const colors = [...new Set(products.map(p => p.color))].sort();

    console.log('Processed products:', products);
    console.log('Sizes:', sizes);
    console.log('Colors:', colors);

    // Créer une map des produits
    const productMap = {};
    products.forEach(product => {
      if (product.color && product.size) {
        if (!productMap[product.color]) {
          productMap[product.color] = {};
        }
        productMap[product.color][product.size] = product;
      }
    });

    // Créer le tableau HTML
    const table = document.createElement('table');
    table.className = 'grouped-products-table';

    // En-tête avec les tailles
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th>Couleur</th>
      ${sizes.map(size => `<th>${size}</th>`).join('')}
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corps du tableau
    const tbody = document.createElement('tbody');
    colors.forEach(color => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${color}</td>
        ${sizes.map(size => {
          const product = productMap[color]?.[size];
          if (product) {
            return `
              <td>
                <div class="product-cell">
                  <input 
                    type="number" 
                    min="0" 
                    value="0"
                    data-sku="${product.sku}"
                    ${!product.inStock ? 'disabled' : ''}
                  />
                  <span class="price">${product.price} ${product.currency}</span>
                </div>
              </td>
            `;
          }
          return '<td></td>';
        }).join('')}
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Ajouter les écouteurs d'événements
    table.addEventListener('change', (e) => {
      if (e.target.tagName === 'INPUT') {
        const sku = e.target.dataset.sku;
        const quantity = parseInt(e.target.value, 10);
        console.log(`Produit ${sku}: quantité ${quantity}`);
      }
    });

    // Remplacer le contenu du bloc
    block.innerHTML = '';
    block.appendChild(table);

  } catch (error) {
    console.error('Erreur lors du chargement des produits groupés:', error);
    block.innerHTML = '<div class="error">Erreur lors du chargement des produits groupés: ${error.message}</div>';
  }
}
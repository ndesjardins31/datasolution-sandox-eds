import { fetchGraphQL } from '../../../scripts/commerce.js';

export default async function decorate(block) {
  const productId = block.dataset.productId;

  // Requête GraphQL pour obtenir les détails des produits groupés
  const query = `
    query GetGroupedProductDetails($productId: String!) {
      products(filter: { id: { eq: $productId } }) {
        items {
          ... on GroupedProduct {
            items {
              product {
                sku
                name
                price_range {
                  minimum_price {
                    final_price {
                      value
                      currency
                    }
                  }
                }
                stock_status
                custom_attributes {
                  attribute_code
                  attribute_value
                }
              }
              qty
              position
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchGraphQL(query, { productId });
    const groupedProducts = response.data?.products?.items[0]?.items || [];

    // Extraire les tailles et couleurs uniques
    const sizes = [...new Set(groupedProducts.map(item => 
      item.product.custom_attributes.find(attr => attr.attribute_code === 'size')?.attribute_value
    ).filter(Boolean))].sort();

    const colors = [...new Set(groupedProducts.map(item => 
      item.product.custom_attributes.find(attr => attr.attribute_code === 'color')?.attribute_value
    ).filter(Boolean))].sort();

    // Créer une map des produits par taille et couleur
    const productMap = {};
    groupedProducts.forEach(item => {
      const size = item.product.custom_attributes.find(attr => attr.attribute_code === 'size')?.attribute_value;
      const color = item.product.custom_attributes.find(attr => attr.attribute_code === 'color')?.attribute_value;
      
      if (size && color) {
        if (!productMap[color]) {
          productMap[color] = {};
        }
        productMap[color][size] = {
          ...item.product,
          qty: item.qty
        };
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

    // Corps du tableau avec les couleurs et les inputs
    const tbody = document.createElement('tbody');
    colors.forEach(color => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${color}</td>
        ${sizes.map(size => {
          const product = productMap[color]?.[size];
          if (product) {
            const price = product.price_range.minimum_price.final_price;
            return `
              <td>
                <div class="product-cell">
                  <input 
                    type="number" 
                    min="0" 
                    value="0"
                    data-sku="${product.sku}"
                    ${product.stock_status === 'OUT_OF_STOCK' ? 'disabled' : ''}
                  />
                  <span class="price">${price.value} ${price.currency}</span>
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
        // Ici vous pouvez ajouter la logique pour mettre à jour le panier
        console.log(`Produit ${sku}: quantité ${quantity}`);
      }
    });

    // Remplacer le contenu du bloc
    block.innerHTML = '';
    block.appendChild(table);

  } catch (error) {
    console.error('Erreur lors du chargement des produits groupés:', error);
    block.innerHTML = '<div class="error">Erreur lors du chargement des produits</div>';
  }
}
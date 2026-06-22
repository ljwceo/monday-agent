// monday.js — alle communicatie met de Monday GraphQL API

const API_URL = 'https://api.monday.com/v2';

// Stuur een GraphQL query of mutatie naar Monday
async function mondayRequest(query) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.MONDAY_API_KEY,
            'API-Version': '2024-01'
        },
        body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
        console.error('Monday API fout:', JSON.stringify(data.errors, null, 2));
        throw new Error(data.errors[0].message);
    }

    return data;
}

// Zoek of een bedrijf al bestaat in Monday op basis van naam
async function zoekBedrijf(bedrijfsnaam) {
    const data = await mondayRequest(`
        query {
            boards(ids: [${process.env.MONDAY_BOARD_ID}]) {
                items_page(
                    limit: 5
                    query_params: {
                        rules: [{
                            column_id: "name"
                            compare_value: ["${bedrijfsnaam}"]
                            operator: contains_text
                        }]
                    }
                ) {
                    items {
                        id
                        name
                    }
                }
            }
        }
    `);

    return data.data.boards[0].items_page.items;
}

// Maak een nieuw item aan in Monday voor een nieuw bedrijf
async function maakNieuwItem(bedrijfsnaam, kolomWaarden) {
    const data = await mondayRequest(`
        mutation {
            create_item(
                board_id: ${process.env.MONDAY_BOARD_ID}
                item_name: "${bedrijfsnaam}"
                column_values: ${JSON.stringify(JSON.stringify(kolomWaarden))}
            ) {
                id
                name
            }
        }
    `);

    return data.data.create_item;
}

// Maak een subitem aan onder een bestaand bedrijfsitem
async function maakSubitem(parentId, naam) {
    const data = await mondayRequest(`
        mutation {
            create_subitem(
                parent_item_id: ${parentId}
                item_name: "${naam}"
            ) {
                id
                name
            }
        }
    `);

    return data.data.create_subitem;
}

// Update een kolom van een bestaand item
async function updateItem(itemId, kolomId, waarde) {
    const data = await mondayRequest(`
        mutation {
            change_column_value(
                board_id: ${process.env.MONDAY_BOARD_ID}
                item_id: ${itemId}
                column_id: "${kolomId}"
                value: ${JSON.stringify(JSON.stringify(waarde))}
            ) {
                id
            }
        }
    `);

    return data.data.change_column_value;
}

module.exports = { zoekBedrijf, maakNieuwItem, maakSubitem, updateItem };

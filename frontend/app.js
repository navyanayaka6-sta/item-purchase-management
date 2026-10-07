const API_BASE = "http://localhost:5000/api";

let availableItems = [];
let purchaseItemsData = [];

function showMessage(message, type = "success") {
const messageBox = document.getElementById("message");

if (!messageBox) {
    return;
}

messageBox.innerHTML = `
    <div class="alert alert-${type}">
        ${escapeHtml(message)}
    </div>
`;

setTimeout(() => {
    messageBox.innerHTML = "";
}, 5000);


}

function escapeHtml(value) {

if (value === null || value === undefined) {
    return "";
}

return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


}

function getTodayDate() {

const today = new Date();

const year = today.getFullYear();

const month = String(today.getMonth() + 1)
    .padStart(2, "0");

const day = String(today.getDate())
    .padStart(2, "0");

return `${year}-${month}-${day}`;

}

async function apiRequest(url, options = {}) {
try {

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }


    if (!response.ok) {

        const errorMessage =
            data.message ||
            data.error ||
            "Something went wrong.";

        throw new Error(errorMessage);
    }

    return data;

} catch (error) {

    console.error("API Error:", error);

    throw error;
}
}

async function loadDashboard() {

try {

    const [itemsResponse, purchasesResponse] =
        await Promise.all([
            apiRequest("/items"),
            apiRequest("/purchases")
        ]);


    const items =
        getArrayFromResponse(itemsResponse, "items");

    const purchases =
        getArrayFromResponse(purchasesResponse, "purchases");


    const totalItemsElement =
        document.getElementById("totalItems");

    const activeItemsElement =
        document.getElementById("activeItems");

    const outOfStockElement =
        document.getElementById("outOfStock");

    const totalPurchasesElement =
        document.getElementById("totalPurchases");


    if (totalItemsElement) {

        totalItemsElement.textContent =
            items.length;
    }


    if (activeItemsElement) {

        activeItemsElement.textContent =
            items.filter(item =>
                Boolean(item.active)
            ).length;
    }


    if (outOfStockElement) {

        outOfStockElement.textContent =
            items.filter(item =>
                Number(item.stock_available) === 0
            ).length;
    }


    if (totalPurchasesElement) {

        totalPurchasesElement.textContent =
            purchases.length;
    }

} catch (error) {

    console.error(error);
}

}

function getArrayFromResponse(response, property) {

if (Array.isArray(response)) {
    return response;
}

if (response && Array.isArray(response[property])) {
    return response[property];
}

return [];


}


async function loadItemTypes() {

const tableBody =
    document.getElementById("itemTypesTableBody");

const select =
    document.getElementById("itemType");


try {

    const response =
        await apiRequest("/item-types");

    const types =
        getArrayFromResponse(response, "itemTypes");


    if (tableBody) {

        if (types.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        No item types found.
                    </td>
                </tr>
            `;

        } else {

            tableBody.innerHTML =
                types.map(type => `
                    <tr>

                        <td>
                            ${escapeHtml(type.id)}
                        </td>

                        <td>
                            ${escapeHtml(type.type_name)}
                        </td>

                        <td>
                            <div class="action-buttons">

                                <button
                                    class="btn btn-warning btn-small"
                                    onclick="editItemType(
                                        ${type.id},
                                        '${escapeJs(type.type_name)}'
                                    )"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn btn-danger btn-small"
                                    onclick="deleteItemType(${type.id})"
                                >
                                    Delete
                                </button>

                            </div>
                        </td>

                    </tr>
                `).join("");
        }
    }


    if (select) {

        const currentValue =
            select.value;

        select.innerHTML = `
            <option value="">
                Select Item Type
            </option>
        `;

        types.forEach(type => {

            const option =
                document.createElement("option");

            option.value = type.id;

            option.textContent =
                type.type_name;

            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

} catch (error) {

    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    Failed to load item types.
                </td>
            </tr>
        `;
    }

    showMessage(error.message, "error");
}


}

async function addItemType(event) {

event.preventDefault();

const input =
    document.getElementById("typeName");

const typeName =
    input.value.trim();


if (!typeName) {

    showMessage(
        "Item type name is required.",
        "error"
    );

    return;
}


try {

    await apiRequest("/item-types", {

        method: "POST",

        body: JSON.stringify({
            type_name: typeName
        })

    });


    input.value = "";

    showMessage(
        "Item type added successfully."
    );

    await loadItemTypes();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}

}

async function editItemType(id, currentName) {
const newName =
    prompt(
        "Enter new item type name:",
        currentName
    );


if (newName === null) {
    return;
}


const trimmedName =
    newName.trim();


if (!trimmedName) {

    showMessage(
        "Item type name cannot be empty.",
        "error"
    );

    return;
}


try {

    await apiRequest(
        `/item-types/${id}`,
        {
            method: "PUT",

            body: JSON.stringify({
                type_name: trimmedName
            })
        }
    );


    showMessage(
        "Item type updated successfully."
    );

    await loadItemTypes();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}

}

async function deleteItemType(id) {

const confirmed =
    confirm(
        "Are you sure you want to delete this item type?"
    );


if (!confirmed) {
    return;
}


try {

    await apiRequest(
        `/item-types/${id}`,
        {
            method: "DELETE"
        }
    );


    showMessage(
        "Item type deleted successfully."
    );

    await loadItemTypes();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}

}

async function loadItems() {

const tableBody =
    document.getElementById("itemsTableBody");


if (!tableBody) {
    return;
}


try {

    const response =
        await apiRequest("/items");

    const items =
        getArrayFromResponse(response, "items");


    if (items.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    No items found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        items.map(item => {

            const stock =
                Number(item.stock_available);

            const active =
                Boolean(item.active);

            let stockBadge = "";

            if (stock === 0) {

                stockBadge = `
                    <span class="badge badge-out">
                        Out of Stock
                    </span>
                `;

            } else if (stock <= 5) {

                stockBadge = `
                    <span class="badge badge-low">
                        Low Stock
                    </span>
                `;

            } else {

                stockBadge = `
                    <span class="badge badge-stock">
                        In Stock
                    </span>
                `;
            }


            const statusBadge =
                active
                    ? `
                        <span class="badge badge-active">
                            Active
                        </span>
                    `
                    : `
                        <span class="badge badge-inactive">
                            Inactive
                        </span>
                    `;


            return `
                <tr>

                    <td>
                        ${escapeHtml(item.id)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(item.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            item.type_name ||
                            item.item_type_name ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDate(item.purchase_date)
                        )}
                    </td>

                    <td>
                        <strong>
                            ${stock}
                        </strong>
                    </td>

                    <td>
                        ${statusBadge}
                    </td>

                    <td>
                        ${stockBadge}
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="btn btn-primary btn-small"
                                onclick="editItem(${item.id})"
                            >
                                Edit
                            </button>

                            <button
                                class="btn ${
                                    active
                                        ? "btn-warning"
                                        : "btn-success"
                                } btn-small"
                                onclick="toggleItemStatus(
                                    ${item.id},
                                    ${active}
                                )"
                            >
                                ${
                                    active
                                        ? "Deactivate"
                                        : "Activate"
                                }
                            </button>

                            <button
                                class="btn btn-danger btn-small"
                                onclick="deleteItem(${item.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join("");

} catch (error) {

    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                Failed to load items.
            </td>
        </tr>
    `;

    showMessage(
        error.message,
        "error"
    );
}

}

async function saveItem(event) {

event.preventDefault();


const id =
    document.getElementById("itemId").value;

const name =
    document.getElementById("itemName").value.trim();

const itemTypeId =
    document.getElementById("itemType").value;

const purchaseDate =
    document.getElementById("purchaseDate").value;

const stockAvailable =
    document.getElementById("stockAvailable").value;

const active =
    document.getElementById("itemActive").checked;


if (!name) {

    showMessage(
        "Item name is required.",
        "error"
    );

    return;
}


if (!itemTypeId) {

    showMessage(
        "Please select an item type.",
        "error"
    );

    return;
}


if (!purchaseDate) {

    showMessage(
        "Purchase date is required.",
        "error"
    );

    return;
}


if (
    stockAvailable === "" ||
    Number(stockAvailable) < 0
) {

    showMessage(
        "Stock cannot be negative.",
        "error"
    );

    return;
}


const itemData = {

    name: name,

    item_type_id: Number(itemTypeId),

    purchase_date: purchaseDate,

    stock_available:
        Number(stockAvailable),

    active: active

};


try {

    if (id) {

        await apiRequest(
            `/items/${id}`,
            {
                method: "PUT",

                body: JSON.stringify(itemData)
            }
        );

        showMessage(
            "Item updated successfully."
        );

    } else {

        await apiRequest(
            "/items",
            {
                method: "POST",

                body: JSON.stringify(itemData)
            }
        );

        showMessage(
            "Item added successfully."
        );
    }


    resetItemForm();

    await loadItems();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}

async function editItem(id) {

try {

    const response =
        await apiRequest(`/items/${id}`);

    const item =
        response.item || response;


    document.getElementById("itemId").value =
        item.id;

    document.getElementById("itemName").value =
        item.name;

    document.getElementById("itemType").value =
        item.item_type_id;

    document.getElementById("purchaseDate").value =
        formatDateForInput(item.purchase_date);

    document.getElementById("stockAvailable").value =
        item.stock_available;

    document.getElementById("itemActive").checked =
        Boolean(item.active);


    document.getElementById("itemFormTitle").textContent =
        "Edit Item";

    document.getElementById("itemSubmitButton").textContent =
        "Update Item";

    document.getElementById("cancelEditButton").style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}

function cancelItemEdit() {


resetItemForm();


}

function resetItemForm() {

const form =
    document.getElementById("itemForm");

if (!form) {
    return;
}


form.reset();


document.getElementById("itemId").value = "";

document.getElementById("itemActive").checked = true;

document.getElementById("itemFormTitle").textContent =
    "Add New Item";

document.getElementById("itemSubmitButton").textContent =
    "Add Item";

document.getElementById("cancelEditButton").style.display =
    "none";


}

async function toggleItemStatus(id, currentlyActive) {

const action =
    currentlyActive
        ? "deactivate"
        : "activate";


const confirmed =
    confirm(
        `Are you sure you want to ${action} this item?`
    );


if (!confirmed) {
    return;
}


try {

    const response =
        await apiRequest(`/items/${id}`);


    const item =
        response.item || response;


    await apiRequest(
        `/items/${id}`,
        {
            method: "PUT",

            body: JSON.stringify({

                name: item.name,

                item_type_id:
                    item.item_type_id,

                purchase_date:
                    formatDateForInput(
                        item.purchase_date
                    ),

                stock_available:
                    Number(item.stock_available),

                active:
                    !currentlyActive

            })
        }
    );


    showMessage(
        `Item ${action}d successfully.`
    );

    await loadItems();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}

async function deleteItem(id) {

const confirmed =
    confirm(
        "Are you sure you want to delete this item?"
    );


if (!confirmed) {
    return;
}


try {

    await apiRequest(
        `/items/${id}`,
        {
            method: "DELETE"
        }
    );


    showMessage(
        "Item deleted successfully."
    );

    await loadItems();

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}


async function loadPurchaseItems() {

try {

    const response =
        await apiRequest("/items");

    const items =
        getArrayFromResponse(response, "items");


    availableItems =
        items.filter(item =>
            Boolean(item.active)
        );

} catch (error) {

    availableItems = [];

    showMessage(
        error.message,
        "error"
    );
}


}

function addPurchaseRow() {


const tbody =
    document.getElementById("purchaseItemsBody");


if (!tbody) {
    return;
}


const rowId =
    `purchase-row-${Date.now()}-${Math.floor(
        Math.random() * 1000
    )}`;


const row =
    document.createElement("tr");

row.id = rowId;


row.innerHTML = `

    <td>

        <select
            class="purchase-item-select"
            onchange="updatePurchaseRowStock(this)"
            required
        >

            <option value="">
                Select Item
            </option>

            ${availableItems.map(item => `
                <option
                    value="${item.id}"
                    data-stock="${item.stock_available}"
                >
                    ${escapeHtml(item.name)}
                    -
                    ${escapeHtml(
                        item.type_name ||
                        item.item_type_name ||
                        ""
                    )}
                </option>
            `).join("")}

        </select>

    </td>


    <td class="available-stock">
        -
    </td>


    <td>

        <input
            type="number"
            class="purchase-quantity"
            min="1"
            value="1"
            required
            onchange="updatePurchaseSummary()"
        >

    </td>


    <td>

        <button
            type="button"
            class="btn btn-danger btn-small"
            onclick="removePurchaseRow('${rowId}')"
        >
            Remove
        </button>

    </td>

`;


tbody.appendChild(row);


updatePurchaseSummary();


}

function updatePurchaseRowStock(select) {


const row =
    select.closest("tr");

const stockCell =
    row.querySelector(".available-stock");

const quantityInput =
    row.querySelector(".purchase-quantity");


const option =
    select.options[select.selectedIndex];


if (!option || !option.value) {

    stockCell.textContent = "-";

    quantityInput.max = "";

    updatePurchaseSummary();

    return;
}


const stock =
    Number(
        option.getAttribute("data-stock")
    );


stockCell.innerHTML =
    stock > 0
        ? `<span class="badge badge-stock">${stock}</span>`
        : `<span class="badge badge-out">0</span>`;


quantityInput.max =
    stock;


if (Number(quantityInput.value) > stock) {

    quantityInput.value =
        stock > 0 ? stock : 1;
}


updatePurchaseSummary();

}

function removePurchaseRow(rowId) {

const row =
    document.getElementById(rowId);


if (row) {
    row.remove();
}


updatePurchaseSummary();


}

function updatePurchaseSummary() {


const rows =
    document.querySelectorAll(
        "#purchaseItemsBody tr"
    );


let totalItems = 0;

let totalQuantity = 0;


rows.forEach(row => {

    const select =
        row.querySelector(
            ".purchase-item-select"
        );

    const quantity =
        row.querySelector(
            ".purchase-quantity"
        );


    if (
        select &&
        select.value &&
        quantity
    ) {

        totalItems++;

        totalQuantity +=
            Number(quantity.value) || 0;
    }

});


const totalItemsElement =
    document.getElementById(
        "totalPurchaseItems"
    );

const totalQuantityElement =
    document.getElementById(
        "totalPurchaseQuantity"
    );


if (totalItemsElement) {
    totalItemsElement.textContent =
        totalItems;
}


if (totalQuantityElement) {
    totalQuantityElement.textContent =
        totalQuantity;
}


}

async function createPurchase(event) {
event.preventDefault();


const purchaseDate =
    document.getElementById(
        "purchaseDate"
    ).value;


if (!purchaseDate) {

    showMessage(
        "Purchase date is required.",
        "error"
    );

    return;
}


const rows =
    document.querySelectorAll(
        "#purchaseItemsBody tr"
    );


if (rows.length === 0) {

    showMessage(
        "Please add at least one item.",
        "error"
    );

    return;
}


const items = [];

const selectedItemIds =
    new Set();


for (const row of rows) {

    const select =
        row.querySelector(
            ".purchase-item-select"
        );

    const quantityInput =
        row.querySelector(
            ".purchase-quantity"
        );


    const itemId =
        Number(select.value);

    const quantity =
        Number(quantityInput.value);


    if (!itemId) {

        showMessage(
            "Please select an item in every row.",
            "error"
        );

        return;
    }


    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {

        showMessage(
            "Quantity must be greater than zero.",
            "error"
        );

        return;
    }


    if (selectedItemIds.has(itemId)) {

        showMessage(
            "The same item cannot be added more than once.",
            "error"
        );

        return;
    }


    selectedItemIds.add(itemId);


    const item =
        availableItems.find(
            x => Number(x.id) === itemId
        );


    if (!item) {

        showMessage(
            "Selected item was not found.",
            "error"
        );

        return;
    }


    if (quantity > Number(item.stock_available)) {

        showMessage(
            `Not enough stock for ${item.name}. Available stock: ${item.stock_available}.`,
            "error"
        );

        return;
    }


    items.push({

        item_id: itemId,

        quantity: quantity

    });

}


const purchaseData = {

    purchase_date: purchaseDate,

    items: items

};


try {

    const response =
        await apiRequest(
            "/purchases",
            {
                method: "POST",

                body: JSON.stringify(
                    purchaseData
                )
            }
        );


    const orderId =
        response.order_id ||
        response.purchase?.order_id ||
        response.data?.order_id;


    showMessage(
        orderId
            ? `Purchase ${orderId} created successfully.`
            : "Purchase created successfully."
    );


    setTimeout(() => {

        window.location.href =
            "purchases.html";

    }, 1000);


} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}


async function loadPurchases() {

const tableBody =
    document.getElementById(
        "purchasesTableBody"
    );


if (!tableBody) {
    return;
}


try {

    const response =
        await apiRequest("/purchases");


    const purchases =
        getArrayFromResponse(
            response,
            "purchases"
        );


    if (purchases.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    No purchases found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        purchases.map(purchase => {

            const totalItems =
                purchase.total_items ??
                purchase.item_count ??
                0;

            const totalQuantity =
                purchase.total_quantity ??
                purchase.quantity_total ??
                0;


            return `

                <tr>

                    <td>
                        ${escapeHtml(purchase.id)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(
                                purchase.order_id
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDate(
                                purchase.purchase_date
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(totalItems)}
                    </td>

                    <td>
                        ${escapeHtml(totalQuantity)}
                    </td>

                    <td>

                        <button
                            class="btn btn-primary btn-small"
                            onclick="viewPurchase(
                                ${purchase.id}
                            )"
                        >
                            View Details
                        </button>

                    </td>

                </tr>

            `;

        }).join("");

} catch (error) {

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Failed to load purchases.
            </td>
        </tr>
    `;

    showMessage(
        error.message,
        "error"
    );
}


}

async function viewPurchase(id) {


const section =
    document.getElementById(
        "purchaseDetailsSection"
    );

const details =
    document.getElementById(
        "purchaseDetails"
    );


try {

    const response =
        await apiRequest(
            `/purchases/${id}`
        );


    const purchase =
        response.purchase ||
        response;


    const items =
        response.items ||
        purchase.items ||
        [];


    const orderId =
        purchase.order_id ||
        "-";


    const purchaseDate =
        purchase.purchase_date ||
        "-";


    const totalQuantity =
        items.reduce(
            (sum, item) =>
                sum + Number(
                    item.quantity || 0
                ),
            0
        );


    details.innerHTML = `

        <div class="details-grid">

            <div class="detail-box">

                <small>
                    Purchase ID
                </small>

                <strong>
                    ${escapeHtml(
                        purchase.id
                    )}
                </strong>

            </div>


            <div class="detail-box">

                <small>
                    Order ID
                </small>

                <strong>
                    ${escapeHtml(orderId)}
                </strong>

            </div>


            <div class="detail-box">

                <small>
                    Purchase Date
                </small>

                <strong>
                    ${escapeHtml(
                        formatDate(
                            purchaseDate
                        )
                    )}
                </strong>

            </div>


            <div class="detail-box">

                <small>
                    Number of Items
                </small>

                <strong>
                    ${items.length}
                </strong>

            </div>


            <div class="detail-box">

                <small>
                    Total Quantity
                </small>

                <strong>
                    ${totalQuantity}
                </strong>

            </div>

        </div>


        <h3>
            Purchased Items
        </h3>


        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            Item ID
                        </th>

                        <th>
                            Item Name
                        </th>

                        <th>
                            Item Type
                        </th>

                        <th>
                            Quantity
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        items.length === 0
                            ? `
                                <tr>
                                    <td
                                        colspan="4"
                                        class="text-center"
                                    >
                                        No items found.
                                    </td>
                                </tr>
                            `
                            :
                            items.map(item => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            item.item_id ||
                                            item.id
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            item.name ||
                                            item.item_name ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            item.type_name ||
                                            item.item_type_name ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        <strong>
                                            ${escapeHtml(
                                                item.quantity
                                            )}
                                        </strong>
                                    </td>

                                </tr>

                            `).join("")
                    }

                </tbody>

            </table>

        </div>

    `;


    section.style.display =
        "block";


    section.scrollIntoView({
        behavior: "smooth"
    });

} catch (error) {

    showMessage(
        error.message,
        "error"
    );
}


}

function closePurchaseDetails() {

const section =
    document.getElementById(
        "purchaseDetailsSection"
    );


if (section) {

    section.style.display =
        "none";
}


}


function formatDate(dateValue) {

if (!dateValue) {
    return "-";
}


const date =
    new Date(dateValue);


if (Number.isNaN(date.getTime())) {
    return dateValue;
}


const year =
    date.getFullYear();

const month =
    String(
        date.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        date.getDate()
    ).padStart(2, "0");


return `${day}-${month}-${year}`;

}

function formatDateForInput(dateValue) {
if (!dateValue) {
    return "";
}


if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
) {

    return dateValue;
}


const date =
    new Date(dateValue);


if (Number.isNaN(date.getTime())) {
    return "";
}


const year =
    date.getFullYear();

const month =
    String(
        date.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        date.getDate()
    ).padStart(2, "0");


return `${year}-${month}-${day}`;


}



function escapeJs(value) {
return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");


}

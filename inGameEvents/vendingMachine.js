const Items = require('../util/items.js');
const MapCalc = require('../util/mapCalculations.js');
const RustPlusTypes = require('../util/rustplusTypes.js');

module.exports = {
    checkEvent: function (rustplus, client, info, mapMarkers, teamInfo, time) {
        for (let marker of mapMarkers.response.mapMarkers.markers) {
            if (marker.type === RustPlusTypes.MarkerType.VendingMachine) {
                /* Check if new Vending Machine is detected */
                module.exports.checkNewVendingMachineDetected(rustplus, marker, info);

                /* Go through sellOrders to see if it includes items that we are looking for */
                module.exports.checkItemsFromSellOrders(rustplus, marker, info);
            }
        }
    },

    checkNewVendingMachineDetected: function (rustplus, marker, info) {
        if (!rustplus.currentVendingMachines.some(e => e.x === marker.x && e.y === marker.y)) {
            rustplus.currentVendingMachines.push({ x: marker.x, y: marker.y });

            let gridLocation = MapCalc.getGridPos(marker.x, marker.y, info.response.info.mapSize);

            if (!rustplus.firstPoll && rustplus.notificationSettings.vendingMachineDetected) {
                rustplus.sendEvent(`New Vending Machine located at ${gridLocation}`);
            }
        }
    },

    checkItemsFromSellOrders: function (rustplus, marker, info) {
        for (let order of marker.sellOrders) {
            /* if itemId or currencyId is in itemsToLookForId */
            if (rustplus.itemsToLookForId.includes(order.itemId) ||
                rustplus.itemsToLookForId.includes(order.currencyId)) {
                if (!module.exports.isAlreadyInFoundItems(rustplus, marker.x, marker.y, order)) {
                    if (order.amountInStock >= 1) {
                        /* Add to the array of found items */
                        module.exports.addToFoundItems(rustplus, marker.x, marker.y, order);

                        let item = '';
                        if (rustplus.itemsToLookForId.includes(order.itemId) &&
                            rustplus.itemsToLookForId.includes(order.currencyId)) {
                            item = Items.getName(order.itemId) + ' and ';
                            item += Items.getName(order.currencyId);
                        }
                        else if (rustplus.itemsToLookForId.includes(order.itemId)) {
                            item = Items.getName(order.itemId);
                        }
                        else if (rustplus.itemsToLookForId.includes(order.currencyId)) {
                            item = Items.getName(order.currencyId);
                        }

                        let gridLocation = MapCalc.getGridPos(marker.x, marker.y, info.response.info.mapSize);

                        rustplus.sendEvent(`${item} was found in a Vending Machine at ${gridLocation}`);
                    }
                }
            }
        }
    },

    isAlreadyInFoundItems: function (rustplus, x, y, order) {
        return rustplus.foundItems.some(e => e.x === x && e.y === y &&
            e.itemId === order.itemId && e.quantity === order.quantity &&
            e.currencyId === order.currencyId && e.costPerItem === order.costPerItem)
    },

    addToFoundItems: function (rustplus, x, y, order) {
        rustplus.foundItems.push({
            x: x, y: y, itemId: order.itemId, quantity: order.quantity,
            currencyId: order.currencyId, costPerItem: order.costPerItem
        });
    },
}
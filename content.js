function getHotelInfo() {
    // Get hotel name and current price from Booking.com page
    const hotelName = document.querySelector('h2.pp-header__title')?.textContent?.trim();
    const priceElement = document.querySelector('span.prco-valign-middle-helper');
    const price = priceElement ? 
        parseFloat(priceElement.textContent.replace(/[^0-9.]/g, '')) : 
        null;
    
    return { name: hotelName, price: price };
}

function showPriceComparison(data) {
    // Only show alert if cheaper price found
    if (!data.found || data.difference <= 0) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    alertDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #4CAF50;">Better Price Found!</h3>
        <p>Save ${data.difference}% on ${data.source}</p>
        <p>New price: €${data.cheaperPrice.toFixed(2)}</p>
        <button onclick="this.parentElement.remove()" style="
            position: absolute;
            top: 5px;
            right: 5px;
            background: none;
            border: none;
            cursor: pointer;
        ">✕</button>
    `;
    
    document.body.appendChild(alertDiv);
}

// Check prices when page loads
const hotelInfo = getHotelInfo();
if (hotelInfo.name && hotelInfo.price) {
    chrome.runtime.sendMessage({
        type: 'COMPARE_PRICES',
        hotelInfo: hotelInfo
    }, showPriceComparison);
}

// Watch for price changes
const observer = new MutationObserver(() => {
    const newHotelInfo = getHotelInfo();
    if (newHotelInfo.name && newHotelInfo.price) {
        chrome.runtime.sendMessage({
            type: 'COMPARE_PRICES',
            hotelInfo: newHotelInfo
        }, showPriceComparison);
    }
});

observer.observe(document.body, { 
    subtree: true, 
    childList: true 
});

let amadeusToken = null;

async function getAmadeusToken() {
    // You'll need to sign up for Amadeus API to get these
    const API_KEY = IC9c1Amz9IclnAeICsNuErjGj3q0nREJ;
    const API_SECRET = PQRRmiZYmqXLyAA8;
    
    try {
        const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=client_credentials&client_id=${API_KEY}&client_secret=${API_SECRET}`
        });
        
        const data = await response.json();
        amadeusToken = data.access_token;
        return amadeusToken;
    } catch (error) {
        console.error('Error getting Amadeus token:', error);
        return null;
    }
}

async function searchHotelPrices(hotelInfo) {
    if (!amadeusToken) {
        await getAmadeusToken();
    }
    
    try {
        // Search for hotel
        const searchResponse = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-keyword?keyword=${encodeURIComponent(hotelInfo.name)}&countryCode=DE`, {
            headers: {
                'Authorization': `Bearer ${amadeusToken}`
            }
        });
        
        const searchData = await searchResponse.json();
        if (!searchData.data?.[0]?.hotelId) {
            return null;
        }
        
        // Get hotel offers
        const hotelId = searchData.data[0].hotelId;
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        const offersResponse = await fetch(`https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelId}&checkInDate=${today}&checkOutDate=${tomorrow}&roomQuantity=1&adults=2&currency=EUR`, {
            headers: {
                'Authorization': `Bearer ${amadeusToken}`
            }
        });
        
        const offersData = await offersResponse.json();
        
        // Get cheapest room price
        const offers = offersData.data?.[0]?.offers || [];
        if (offers.length === 0) return null;
        
        const cheapestOffer = offers.reduce((min, offer) => 
            parseFloat(offer.price.total) < parseFloat(min.price.total) ? offer : min
        );
        
        return {
            price: parseFloat(cheapestOffer.price.total),
            source: cheapestOffer.source
        };
    } catch (error) {
        console.error('Error fetching hotel prices:', error);
        return null;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'COMPARE_PRICES') {
        searchHotelPrices(request.hotelInfo)
            .then(priceData => {
                if (!priceData) {
                    sendResponse({ found: false });
                    return;
                }
                
                const currentPrice = request.hotelInfo.price;
                const difference = ((currentPrice - priceData.price) / currentPrice * 100).toFixed(1);
                
                sendResponse({
                    found: true,
                    difference: difference,
                    cheaperPrice: priceData.price,
                    source: priceData.source
                });
            });
        return true; // Required for async response
    }
});

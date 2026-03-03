import axios from 'axios';

// Основной API - OpenStreetMap Nominatim
export const getLocationFromCoords = async (lat: number, lon: number): Promise<string> => {
    try {
        console.log('Getting location for coordinates:', lat, lon);

        // Пробуем OpenStreetMap сначала
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'MARKIdentity-App'
                }
            }
        );

        if (response.ok) {
            const data = await response.json();
            console.log('OpenStreetMap response:', data);

            if (data && data.address) {
                const address = data.address;

                // Пробуем разные варианты названия города
                const city = address.city ||
                    address.town ||
                    address.village ||
                    address.hamlet ||
                    address.municipality ||
                    address.county ||
                    address.state_district ||
                    address.state ||
                    '';

                const country = address.country || '';

                if (city && country) {
                    return `${city}, ${country}`;
                } else if (country) {
                    return country;
                }
            }
        }

        // Если OpenStreetMap не сработал, пробуем BigDataCloud
        return await getLocationFromBigDataCloud(lat, lon);
    } catch (error) {
        console.error('Error with OpenStreetMap:', error);
        // Пробуем запасной вариант
        return await getLocationFromBigDataCloud(lat, lon);
    }
};

// Запасной API - BigDataCloud (бесплатный, не требует ключа)
export const getLocationFromBigDataCloud = async (lat: number, lon: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );

        if (response.ok) {
            const data = await response.json();
            console.log('BigDataCloud response:', data);

            const city = data.city || data.locality || data.principalSubdivision || '';
            const country = data.countryName || '';

            if (city && country) {
                return `${city}, ${country}`;
            } else if (country) {
                return country;
            }
        }

        return 'Unknown location';
    } catch (error) {
        console.error('Error with BigDataCloud:', error);
        return 'Unknown location';
    }
};

// Получение локации по IP
export const getLocationByIP = async (): Promise<string | null> => {
    try {
        // Пробуем ipapi.co
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data && data.city && data.country_name) {
            return `${data.city}, ${data.country_name}`;
        }

        // Если не сработало, пробуем ip-api.com
        const response2 = await fetch('http://ip-api.com/json/');
        const data2 = await response2.json();

        if (data2 && data2.city && data2.country) {
            return `${data2.city}, ${data2.country}`;
        }

        return null;
    } catch (error) {
        console.error('Error getting location by IP:', error);
        return null;
    }
};

// Функция для форматирования координат в понятный адрес
export const formatCoordinates = (lat: number, lon: number): string => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';

    const latAbs = Math.abs(lat).toFixed(2);
    const lonAbs = Math.abs(lon).toFixed(2);

    return `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`;
};
// Clash Royale API integration
const BASE_URL = 'https://api.clashroyale.com/v1';
const API_KEY = process.env.CLASH_ROYALE_API_KEY;

if (!API_KEY) {
  console.warn('Warning: CLASH_ROYALE_API_KEY not set. Clash Royale API features will not work.');
}

interface ClashRoyaleApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

async function clashRoyaleRequest<T>(endpoint: string): Promise<ClashRoyaleApiResponse<T>> {
  if (!API_KEY) {
    return {
      error: 'API key not configured',
      status: 500,
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Clash Royale API error (${response.status}):`, errorText);
      
      return {
        error: response.status === 404 
          ? 'Player not found' 
          : `API error: ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    console.error('Clash Royale API request failed:', error);
    return {
      error: 'Failed to connect to Clash Royale API',
      status: 500,
    };
  }
}

export async function getPlayerByTag(tag: string) {
  // Remove # if present and ensure proper encoding
  const cleanTag = tag.replace('#', '');
  const encodedTag = encodeURIComponent(`#${cleanTag}`);
  
  return clashRoyaleRequest(`/players/${encodedTag}`);
}

export async function getPlayerBattles(tag: string) {
  const cleanTag = tag.replace('#', '');
  const encodedTag = encodeURIComponent(`#${cleanTag}`);
  
  return clashRoyaleRequest(`/players/${encodedTag}/battlelog`);
}

export async function getCards() {
  return clashRoyaleRequest('/cards');
}

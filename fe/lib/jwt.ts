import { UserRole } from '@/types';

interface DecodedToken {
  sub: string; // user_id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token (client-side decoding - no verification)
 * For token verification, rely on the server's response
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    return decoded as DecodedToken;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Extract user info from token
 */
export function getUserFromToken(token: string) {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}

/**
 * Check if token is valid and not expired
 */
export function isTokenValid(token: string): boolean {
  return !isTokenExpired(token);
}

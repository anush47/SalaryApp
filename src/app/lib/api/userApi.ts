import { apiFetch } from './commonApi';

/**
 * Fetch user by ID
 */
export async function fetchUser(userId: string) {
    const data = await apiFetch(`/api/users?userId=${userId}`);
    return data.users?.[0] || null;
}

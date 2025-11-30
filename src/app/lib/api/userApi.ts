import { apiFetch } from './commonApi';

/**
 * Fetch user by ID
 */
export async function fetchUser(userId: string) {
    const data = await apiFetch(`/api/users?userId=${userId}`);

    if (data && data.users) {
        return Array.isArray(data.users) ? data.users[0] : data.users;
    }

    if (data && data.data && data.data.users) {
        return Array.isArray(data.data.users) ? data.data.users[0] : data.data.users;
    }

    return null;
}

/**
 * Fetch all users
 */
export async function fetchUsers() {
    const data = await apiFetch('/api/users');

    if (data && data.users) {
        return data.users;
    }

    if (data && data.data && data.data.users) {
        return data.data.users;
    }

    if (data && Array.isArray(data)) {
        return data;
    }

    return [];
}

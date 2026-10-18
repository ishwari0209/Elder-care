
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// -------------------- API CONFIGURATION --------------------

const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000'
    : 'http://172.18.79.106:5000';

const TOKEN_KEY = 'saathi_token';

// -------------------- TOKEN STORAGE --------------------

export async function getAuthToken() {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function saveAuthToken(token) {
  if (!token) return;

  if (Platform.OS === 'web') {
    sessionStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function logout() {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// -------------------- HTTP REQUESTS --------------------

async function authFetch(path, options = {}) {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return response;
}



async function request(path, options = {}) {
  const response = await authFetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}



// -------------------- AUTHENTICATION --------------------

export async function signup(details) {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(details),
  });

  if (data.token) {
    await saveAuthToken(data.token);
  }

  return data;
}

export async function login(email, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (data.token) {
    await saveAuthToken(data.token);
  }

  return data;
}

// -------------------- PROFILE --------------------

export async function getProfile() {
  const data = await request('/api/profile');
  return data.profile ?? data;
}

export async function saveProfile(profile) {
  return request('/api/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

// -------------------- ROUTINES --------------------

export async function getRoutines() {
  const data = await request('/api/routines');

  return Array.isArray(data) ? data : data.routines ?? [];
}

export async function saveRoutines(routines) {
  return request('/api/routines', {
    method: 'PUT',
    body: JSON.stringify({ routines }),
  });
}

// -------------------- MEDICINES --------------------

export async function getMedicines() {
  const data = await request('/api/medicines');

  return Array.isArray(data) ? data : data.medicines ?? [];
}



export async function saveMedicines(medicines, previousMedicines = []) {
  const previous = Array.isArray(previousMedicines)
    ? previousMedicines
    : [];

  const current = Array.isArray(medicines) ? medicines : [];

  const previousById = new Map(
    previous
      .filter((medicine) => medicine._id)
      .map((medicine) => [String(medicine._id), medicine])
  );

  const currentIds = new Set(
    current
      .filter((medicine) => medicine._id)
      .map((medicine) => String(medicine._id))
  );

  // Create new medicines and update existing medicines.
  for (const medicine of current) {
    const { _id, userId, ...fields } = medicine;

    if (_id && previousById.has(String(_id))) {
      const oldMedicine = previousById.get(String(_id));

      // Skip unchanged medicines.
      const unchanged = Object.keys(fields).every(
        (key) => JSON.stringify(fields[key]) ===
          JSON.stringify(oldMedicine[key])
      );

      if (unchanged) continue;

      await request(`/api/medicines/${_id}`, {
        method: 'PUT',
        body: JSON.stringify(fields),
      });
    } else if (!_id) {
      await request('/api/medicines', {
        method: 'POST',
        body: JSON.stringify(fields),
      });
    }
  }

  // Delete only medicines that were removed from the list.
  for (const medicine of previous) {
    if (medicine._id && !currentIds.has(String(medicine._id))) {
      await request(`/api/medicines/${medicine._id}`, {
        method: 'DELETE',
      });
    }
  }

  return await getMedicines();
}


// -------------------- EMERGENCY CONTACTS --------------------

export async function getContacts() {
  const data = await request('/api/contacts');
  return data.contacts ?? data;
}

export async function saveContacts(contacts) {
  return request('/api/contacts', {
    method: 'PUT',
    body: JSON.stringify(contacts),
  });
}

// -------------------- CARE STATUS --------------------

export async function getCareStatus() {
  return request('/api/care-status');
}

// -------------------- COMPLETION HISTORY --------------------

export async function getCompletions(date) {
  const query = date
    ? `?date=${encodeURIComponent(date)}`
    : '';

  return request(`/api/completions${query}`);
}

export async function saveCompletion({
  itemType,
  itemId,
  date,
  time = '',
  reportedDone = true,
  note = '',
}) {
  const data = await request('/api/completions', {
    method: 'POST',
    body: JSON.stringify({
      itemType,
      itemId,
      date,
      time,
      reportedDone,
      note,
    }),
  });

  return data.completion;
}


import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// -------------------- API CONFIGURATION --------------------

const API_BASE_URL = ' https://saathi-backend-9nhr.onrender.com';

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

export async function signup(nameOrDetails, email, password) {
  const details =
    typeof nameOrDetails === 'object' && nameOrDetails !== null
      ? nameOrDetails
      : { name: nameOrDetails, email, password };

  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: details.name?.trim(),
      email: details.email?.trim().toLowerCase(),
      password: details.password ?? details.pw,
    }),
  });
}

export async function verifySignup(email, otp) {
  const data = await request('/api/auth/verify-signup', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
    }),
  });

  if (data.token) {
    await saveAuthToken(data.token);
  }

  return data.user;
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

  return data.user;
}

export async function googleAuth(idToken) {
  const data = await request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

  if (data.token) {
    await saveAuthToken(data.token);
  }

  return data.user;
}

export async function forgotPassword(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });
}

export async function resetPassword(email, otp, newPassword) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
      newPassword,
    }),
  });
}

// -------------------- PROFILE --------------------

// Get the existing user's profile.
export async function getProfile() {
  const data = await request('/api/profile');
  return data.profile ?? data;
}

// Create a profile when the user does not have one yet.
export async function saveProfile(profile) {
  return request('/api/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

// Update an existing profile.
export async function updateProfile(profile) {
  return request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// -------------------- ROUTINES --------------------

export async function getRoutines() {
  const data = await request('/api/routines');

  return Array.isArray(data) ? data : data.routines ?? [];
}

export async function saveRoutines(routines) {
  return request('/api/routines/sync/all', {
    method: 'PUT',
    body: JSON.stringify({
      items: Array.isArray(routines) ? routines : [],
    }),
  });
}

// -------------------- AI VOICE COMPANION --------------------

export async function askSaathiAI({
  message,
  language = 'English',
  context = {},
}) {
  return request('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      language,
      context,
    }),
  });
}

// Free conversation with Saathi. Returns { reply, actions, lang }.
export async function chatWithSaathi({ messages, language = 'English', profile = {} }) {
  return request('/api/ai/companion', {
    method: 'POST',
    body: JSON.stringify({ messages, language, profile }),
  });
}

// Sends ONLY redacted medicine text lines (never an image) to be tidied by AI.
export async function parsePrescriptionText(lines, language = 'English') {
  return request('/api/ai/prescription-text', {
    method: 'POST',
    body: JSON.stringify({ lines, language }),
  });
}

// -------------------- MEDICINES --------------------

export async function getMedicines() {
  const data = await request('/api/medicines');

  return Array.isArray(data) ? data : data.medicines ?? [];
}

export async function saveMedicines(
  medicines,
  previousMedicines = []
) {
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

      const unchanged = Object.keys(fields).every(
        (key) =>
          JSON.stringify(fields[key]) ===
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

  // Delete medicines removed from the list.
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

// -------------------- FAMILY / CAREGIVER DASHBOARD --------------------

export async function createCaregiverInvite() {
  return request('/api/caregiver/invite', {
    method: 'POST',
  });
}

export async function acceptCaregiverInvite(code) {
  return request('/api/caregiver/accept', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getLinkedElders() {
  return request('/api/caregiver/elders');
}

export async function getLinkedElderStatus(elderId, date) {
  const query = date
    ? `?date=${encodeURIComponent(date)}`
    : '';

  return request(
    `/api/caregiver/elders/${encodeURIComponent(elderId)}/status${query}`
  );
}

export async function getElderSummary(elderId, date, time, language = 'English') {
  const query = `?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&language=${encodeURIComponent(language)}`;
  return request(`/api/caregiver/elders/${encodeURIComponent(elderId)}/summary${query}`);
}

export async function getLinkedCaregivers() {
  return request('/api/caregiver/caregivers');
}

export async function revokeCaregiverAccess(caregiverId) {
  return request(
    `/api/caregiver/links/${encodeURIComponent(caregiverId)}`,
    { method: 'DELETE' }
  );
}

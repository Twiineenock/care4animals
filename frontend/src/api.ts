const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${API_URL}/api/v1`;

export async function fetchLanguages() {
  const response = await fetch(`${API_BASE_URL}/languages`);
  if (!response.ok) {
    throw new Error("Failed to load languages");
  }
  return response.json();
}

export async function fetchTopics() {
  const response = await fetch(`${API_BASE_URL}/topics`);
  if (!response.ok) {
    throw new Error("Failed to load topics");
  }
  return response.json();
}

export async function fetchLessons(language: string = "en") {
  const response = await fetch(`${API_BASE_URL}/lessons?language=${language}`);
  if (!response.ok) {
    throw new Error("Failed to load lessons");
  }
  return response.json();
}

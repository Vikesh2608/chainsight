const STORAGE_PREFIX = "chainsight_";

export function loadData<T>(
  key: string,
  defaultData: T
): T {
  if (typeof window === "undefined") {
    return defaultData;
  }

  try {
    const storedData = localStorage.getItem(
      `${STORAGE_PREFIX}${key}`
    );

    if (!storedData) {
      return defaultData;
    }

    return JSON.parse(storedData) as T;
  } catch (error) {
    console.error(
      `Failed to load ${key} from localStorage:`,
      error
    );

    return defaultData;
  }
}

export function saveData<T>(
  key: string,
  data: T
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key} to localStorage:`,
      error
    );
  }
}

export function deleteData(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    `${STORAGE_PREFIX}${key}`
  );
}
export function flattenObjTwoLevels(obj: any, parentKey = "", skip?: string) {
  const result: Record<string, any> = {};

  // Use for..in to iterate directly over object keys for efficiency
  for (const key in obj) {
    if (skip && key === skip) continue; // Skip the specific key if it matches 'skip'

    const value = obj[key];
    const newKey = parentKey ? `${parentKey} ${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Iterate over the nested object one level deeper
      for (const subKey in value) {
        if (skip && subKey === skip) continue; // Skip specific subKey if it matches 'skip'

        const subValue = value[subKey];
        const finalKey = `${newKey} ${subKey}`;

        if (
          subValue &&
          typeof subValue === "object" &&
          !Array.isArray(subValue)
        ) {
          // 2nd level flattening
          for (const deepKey in subValue) {
            result[`${finalKey} ${deepKey}`] = subValue[deepKey];
          }
        } else {
          result[finalKey] = subValue;
        }
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export function flattenObjTwoLevelsEnhanced(
  obj: any,
  parentKey = "",
  skip?: string,
) {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (skip && key === skip) continue;

    const value = obj[key];
    const newKey = parentKey ? `${parentKey} ${key}` : key;

    if (Array.isArray(value)) {
      // Handle arrays of objects
      if (value.every((v) => typeof v === "object" && v !== null)) {
        // Concatenate values from each object (join by a specific field, default to all keys)
        const flattenedArrayValues = value
          .map((item) => {
            if (typeof item === "object") {
              // If item has `item_name`, use that; otherwise, join all key-value pairs
              return item.item_name || Object.values(item).join(" ");
            }
            return item;
          })
          .join(", ");
        result[newKey] = flattenedArrayValues;
      } else {
        // Handle arrays of primitives
        result[newKey] = value.join(", ");
      }
    } else if (value && typeof value === "object") {
      // One level deeper
      for (const subKey in value) {
        if (skip && subKey === skip) continue;

        const subValue = value[subKey];
        const finalKey = `${newKey} ${subKey}`;

        if (
          subValue &&
          typeof subValue === "object" &&
          !Array.isArray(subValue)
        ) {
          // 2nd level flattening
          for (const deepKey in subValue) {
            result[`${finalKey} ${deepKey}`] = subValue[deepKey];
          }
        } else {
          result[finalKey] = subValue;
        }
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export const flattenArrayWithoutId = (array: any[]) =>
  array.map((item) => flattenObjTwoLevels(item, "", "id"));

export const flattenArrayWithoutIdEnhanced = (array: any[]) =>
  array.map((item) =>
    flattenObjTwoLevelsEnhanced(item, "", "id"),
  );
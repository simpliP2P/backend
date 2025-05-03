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

export const flattenArrayWithoutId = (array: any[]) =>
  array.map((item) => flattenObjTwoLevels(item, "", "id"));

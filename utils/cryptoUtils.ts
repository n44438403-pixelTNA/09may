/**
 * Generates a cryptographically secure random string of a given length using the provided character set.
 *
 * @param length The length of the string to generate.
 * @param chars The character set to use for generation.
 * @returns A cryptographically secure random string.
 */
export const generateSecureRandomString = (length: number, chars: string): string => {
    const array = new Uint32Array(length);
    const cryptoObj = typeof window !== 'undefined' ? (window.crypto || (window as any).msCrypto) : require('crypto').webcrypto;

    if (!cryptoObj) {
        // Fallback for extreme cases, though webcrypto is widely supported now
        let fallback = '';
        for (let i = 0; i < length; i++) {
            fallback += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return fallback;
    }

    cryptoObj.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(array[i] % chars.length);
    }
    return result;
};

/**
 * Generates a cryptographically secure random ID string.
 * This is intended as a replacement for Math.random().toString(36).substring(2, 2 + length).
 *
 * @param length The length of the ID to generate.
 * @returns A cryptographically secure random alphanumeric string.
 */
export const generateSecureRandomId = (length: number): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return generateSecureRandomString(length, chars);
};

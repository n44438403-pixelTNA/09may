
export const getISTDate = (): Date => {
    // Create a date string in IST
    const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(istString);
};

export const getISTDateString = (): string => {
    return getISTDate().toDateString();
};

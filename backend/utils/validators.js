const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());

const isValidPhone = (value) => {
  const text = String(value || "").trim();
  if (!text) return true;
  return /^\+?[0-9][0-9\s-]{8,18}[0-9]$/.test(text) && text.replace(/\D/g, "").length >= 10;
};

module.exports = {
  isValidEmail,
  isValidPhone
};

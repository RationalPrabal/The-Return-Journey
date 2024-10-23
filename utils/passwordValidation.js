function validateUserCredentials(email, password) {
  // Email validation regex (simple version)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Password validation rules
  const minLength = 8;
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const digitRegex = /\d/;
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

  // Validate email
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  // Validate password
  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }
  if (!uppercaseRegex.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!lowercaseRegex.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!digitRegex.test(password)) {
    return "Password must contain at least one digit";
  }
  if (!specialCharRegex.test(password)) {
    return "Password must contain at least one special character";
  }

  return null; // If both email and password are valid
}

module.exports = {
  validateUserCredentials,
};

/**
 * Form Validation Utility
 */

export function validateField(element, rules) {
    if (!element) return true;

    const value = element.value ? element.value.trim() : "";
    let error = null;

    for (const rule of rules) {
        if (rule.required && !value) {
            error = rule.message || 'This field is required';
            break;
        }
        if (rule.min && value.length < rule.min) {
            error = rule.message || `Minimum ${rule.min} characters required`;
            break;
        }
        if (rule.max && value.length > rule.max) {
            error = rule.message || `Maximum ${rule.max} characters allowed`;
            break;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
            error = rule.message || 'Invalid format';
            break;
        }
    }

    if (error) {
        showError(element, error);
        return false;
    } else {
        clearError(element);
        return true;
    }
}

export function showError(element, message) {
    element.classList.add('invalid-input');
    let errorDisplay = element.parentNode.querySelector('.error-message');

    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.className = 'error-message';
        element.parentNode.appendChild(errorDisplay);
    }

    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';

    // Animate error
    errorDisplay.style.animation = 'shake 0.4s ease';
    setTimeout(() => errorDisplay.style.animation = '', 400);
}

export function clearError(element) {
    element.classList.remove('invalid-input');
    const errorDisplay = element.parentNode.querySelector('.error-message');
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    }
}

export function validateForm(formId, config) {
    const form = document.getElementById(formId);
    if (!form) return true;

    let isValid = true;
    for (const [fieldId, rules] of Object.entries(config)) {
        const field = document.getElementById(fieldId);
        if (!validateField(field, rules)) {
            isValid = false;
        }
    }
    return isValid;
}

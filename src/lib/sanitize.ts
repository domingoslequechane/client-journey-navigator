import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export const inputValidation = {
  name: (value: string): boolean => {
    const regex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    return regex.test(value);
  },
  
  email: (value: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  },
  
  phone: (value: string): boolean => {
    const regex = /^[+\d\s()-]+$/;
    return regex.test(value);
  },
  
  noSpecialChars: (value: string): boolean => {
    const regex = /^[a-zA-ZÀ-ÿ0-9\s\-_.,!?]+$/;
    return regex.test(value);
  },
};

export function validateAndSanitize(field: string, value: string, type: 'name' | 'email' | 'phone' | 'text'): { isValid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeInput(value.trim());
  
  if (!sanitized) {
    return { isValid: false, sanitized: '', error: `${field} é obrigatório` };
  }
  
  if (sanitized.length > 255) {
    return { isValid: false, sanitized: '', error: `${field} excede o limite de 255 caracteres` };
  }
  
  if (type === 'name' && !inputValidation.name(sanitized)) {
    return { isValid: false, sanitized: '', error: `${field} contém caracteres inválidos` };
  }
  
  if (type === 'email' && !inputValidation.email(sanitized)) {
    return { isValid: false, sanitized: '', error: `Email inválido` };
  }
  
  if (type === 'phone' && !inputValidation.phone(sanitized)) {
    return { isValid: false, sanitized: '', error: `Telefone inválido` };
  }
  
  return { isValid: true, sanitized };
}
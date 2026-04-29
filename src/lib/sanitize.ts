import DOMPurify from 'dompurify';

const XSS_PAYLOADS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<svg\s+onload/gi,
  /<body\s+onload/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

function detectXSS(input: string): boolean {
  return XSS_PAYLOADS.some(pattern => pattern.test(input));
}

function decodeEntities(str: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input;
  let iterations = 0;
  const maxIterations = 5;
  
  while (iterations < maxIterations) {
    const decoded = decodeEntities(sanitized);
    if (decoded === sanitized) break;
    sanitized = decoded;
    iterations++;
  }
  
  if (detectXSS(sanitized)) {
    return DOMPurify.sanitize(sanitized, { RETURN_TRUSTED_TYPE: false });
  }
  
  return DOMPurify.sanitize(sanitized);
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  let sanitized = html;
  let iterations = 0;
  const maxIterations = 5;
  
  while (iterations < maxIterations) {
    const decoded = decodeEntities(sanitized);
    if (decoded === sanitized) break;
    sanitized = decoded;
    iterations++;
  }
  
  return DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
  });
}

export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) : sanitizeInput(String(item))
      );
    } else if (typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  
  return result;
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
  if (!value || typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: `${field} é obrigatório` };
  }
  
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
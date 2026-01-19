// CPF/CNPJ formatting and validation utilities

export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const formatCPFCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return formatCPF(digits);
  }
  return formatCNPJ(digits);
};

export const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(digits[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(digits[13])) return false;

  return true;
};

export const validateCPFCNPJ = (value: string): { valid: boolean; type: 'cpf' | 'cnpj' | null; message: string } => {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return { valid: false, type: null, message: 'Informe o CPF ou CNPJ' };
  }
  
  if (digits.length <= 11) {
    if (digits.length < 11) {
      return { valid: false, type: 'cpf', message: 'CPF incompleto' };
    }
    if (validateCPF(digits)) {
      return { valid: true, type: 'cpf', message: 'CPF válido' };
    }
    return { valid: false, type: 'cpf', message: 'CPF inválido' };
  }
  
  if (digits.length < 14) {
    return { valid: false, type: 'cnpj', message: 'CNPJ incompleto' };
  }
  
  if (validateCNPJ(digits)) {
    return { valid: true, type: 'cnpj', message: 'CNPJ válido' };
  }
  return { valid: false, type: 'cnpj', message: 'CNPJ inválido' };
};

// PIX EMV Code Generator for BR
// Based on EMV QR Code Specification for PIX

export interface PixPaymentData {
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txId?: string;
  description?: string;
}

// CRC16-CCITT calculation
function crc16CCITT(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
    crc &= 0xFFFF;
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Format EMV field with ID, length, and value
function formatEMVField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

// Remove special characters and normalize for PIX
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .substring(0, 25);
}

// Get PIX key type code
function getKeyTypeIndicator(keyType: PixPaymentData['pixKeyType']): string {
  switch (keyType) {
    case 'cpf':
    case 'cnpj':
    case 'random':
      return '01'; // DICT key
    case 'phone':
      return '01'; // Phone is also DICT
    case 'email':
      return '01'; // Email is also DICT
    default:
      return '01';
  }
}

// Format PIX key based on type
function formatPixKey(key: string, keyType: PixPaymentData['pixKeyType']): string {
  const cleanKey = key.replace(/\D/g, '');
  
  switch (keyType) {
    case 'cpf':
      return cleanKey.padStart(11, '0');
    case 'cnpj':
      return cleanKey.padStart(14, '0');
    case 'phone':
      // Format: +55DDDNUMBER
      const phoneClean = key.replace(/\D/g, '');
      if (phoneClean.startsWith('55')) {
        return `+${phoneClean}`;
      }
      return `+55${phoneClean}`;
    case 'email':
      return key.toLowerCase();
    case 'random':
      return key; // EVP key, keep as is
    default:
      return key;
  }
}

// Detect PIX key type
export function detectPixKeyType(key: string): PixPaymentData['pixKeyType'] {
  const cleanKey = key.replace(/\D/g, '');
  
  // Check if it's a CPF (11 digits)
  if (cleanKey.length === 11 && /^\d+$/.test(cleanKey)) {
    return 'cpf';
  }
  
  // Check if it's a CNPJ (14 digits)
  if (cleanKey.length === 14 && /^\d+$/.test(cleanKey)) {
    return 'cnpj';
  }
  
  // Check if it's a phone number
  if (/^(\+?55)?[1-9][0-9]{10,11}$/.test(cleanKey)) {
    return 'phone';
  }
  
  // Check if it's an email
  if (/^[^s@]+@[^s@]+.[^s@]+$/.test(key)) {
    return 'email';
  }
  
  // Otherwise it's a random key (EVP)
  return 'random';
}

// Generate PIX EMV code (BR Code)
export function generatePixCode(data: PixPaymentData): string {
  const formattedKey = formatPixKey(data.pixKey, data.pixKeyType);
  
  // Build Merchant Account Information (ID 26)
  const gui = formatEMVField('00', 'br.gov.bcb.pix');
  const keyField = formatEMVField('01', formattedKey);
  
  let merchantInfo = gui + keyField;
  
  // Add description if provided
  if (data.description) {
    merchantInfo += formatEMVField('02', data.description.substring(0, 72));
  }
  
  const merchantAccountInfo = formatEMVField('26', merchantInfo);
  
  // Build the full EMV code
  let emvCode = '';
  
  // Payload Format Indicator (ID 00)
  emvCode += formatEMVField('00', '01');
  
  // Point of Initiation Method (ID 01) - 11 = static, 12 = dynamic
  emvCode += formatEMVField('01', data.amount ? '12' : '11');
  
  // Merchant Account Information (ID 26)
  emvCode += merchantAccountInfo;
  
  // Merchant Category Code (ID 52) - 0000 = not informed
  emvCode += formatEMVField('52', '0000');
  
  // Transaction Currency (ID 53) - 986 = BRL
  emvCode += formatEMVField('53', '986');
  
  // Transaction Amount (ID 54) - optional
  if (data.amount && data.amount > 0) {
    const amountStr = data.amount.toFixed(2);
    emvCode += formatEMVField('54', amountStr);
  }
  
  // Country Code (ID 58)
  emvCode += formatEMVField('58', 'BR');
  
  // Merchant Name (ID 59)
  emvCode += formatEMVField('59', normalizeText(data.merchantName));
  
  // Merchant City (ID 60)
  emvCode += formatEMVField('60', normalizeText(data.merchantCity));
  
  // Additional Data Field Template (ID 62) - with txId
  if (data.txId) {
    const txIdField = formatEMVField('05', data.txId.substring(0, 25));
    emvCode += formatEMVField('62', txIdField);
  } else {
    // Generate a random txId
    const randomTxId = `***`;
    const txIdField = formatEMVField('05', randomTxId);
    emvCode += formatEMVField('62', txIdField);
  }
  
  // CRC16 placeholder (ID 63)
  emvCode += '6304';
  
  // Calculate and append CRC16
  const crc = crc16CCITT(emvCode);
  emvCode += crc;
  
  return emvCode;
}

// Validate PIX code format
export function validatePixCode(code: string): boolean {
  if (!code || code.length < 50) return false;
  
  // Check if starts with payload format indicator
  if (!code.startsWith('0002')) return false;
  
  // Check if ends with CRC
  if (!/6304[A-F0-9]{4}$/.test(code)) return false;
  
  return true;
}

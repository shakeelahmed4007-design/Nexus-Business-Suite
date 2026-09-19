export class PhoneValidator {
  /**
   * Validates phone numbers - accepts any format with 7-15 digits.
   * Pakistani numbers (03xx, +92xx) are also accepted.
   */
  static validate(phone: string): boolean {
    if (!phone) return true;
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!/^\d{7,15}$/.test(cleanPhone)) {
      throw new Error('Invalid phone number (must be 7-15 digits)');
    }
    return true;
  }

  /**
   * Formats Pakistani numbers to +92 format; passes other numbers through.
   */
  static format(phone: string): string {
    if (!phone) return '';
    let formatted = phone.replace(/[\s\-\(\)]/g, '');
    // Pakistani local format: 03xx -> +9203xx
    if (/^03\d{9}$/.test(formatted)) {
      formatted = '+92' + formatted.slice(1);
    } else if (/^3\d{9}$/.test(formatted)) {
      formatted = '+92' + formatted;
    }
    return formatted;
  }
}

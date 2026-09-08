export class EmailValidator {
  static validate(email: string): boolean {
    if (!email) return true;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email.trim())) {
      throw new Error('Invalid email address format');
    }
    return true;
  }
}

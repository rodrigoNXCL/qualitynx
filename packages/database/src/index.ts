export const getClient = () => null;
export const getCurrentSession = async () => ({ session: null, error: null });
export const signIn = async () => ({ data: { user: null, session: null }, error: null });
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';

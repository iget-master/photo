export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type WithRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type WithNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] | null };
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility helper to conditionally merge Tailwind CSS classes dynamically.
 * Combines `clsx` and `twMerge` to handle conflicting classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

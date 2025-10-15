export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateLong = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear());

    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
};

export const formatAge = (dateOfBirth: string | Date | null | undefined): string => {
  if (!dateOfBirth) return 'N/A';

  try {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;

    if (isNaN(dob.getTime())) return 'N/A';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return `${age}`;
  } catch (error) {
    return 'N/A';
  }
};

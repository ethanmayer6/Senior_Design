export type User = {
  id?: number;
  role: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  profileHeadline?: string | null;
  bio?: string | null;
  accentColor?: string | null;
  profileVisibility?: 'EVERYONE' | 'FRIENDS_ONLY' | string;
  showMajorToFriends?: boolean;
  showEmailToFriends?: boolean;
  showPhoneToFriends?: boolean;
  email: string;
  password: string;
  phone: string;
  major: string;
  profilePictureUrl?: string | null;
};
